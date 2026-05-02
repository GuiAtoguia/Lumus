import { NextRequest, NextResponse } from "next/server";

const PIPEFY_GRAPHQL = "https://api.pipefy.com/graphql";

const CARD_QUERY = `
  query GetCard($id: ID!) {
    card(id: $id) {
      id
      title
      done
      created_at
      updated_at
      due_date
      current_phase {
        id
        name
      }
      labels {
        id
        name
        color
      }
      comments {
        id
        text
        created_at
        author { name }
      }
      phases_history {
        phase { id name }
        firstTimeIn
        lastTimeIn
        duration
      }
      fields {
        field { id label type }
        value
        array_value
        date_value
      }
    }
  }
`;

async function fetchCard(cardId: string, token: string) {
  const res = await fetch(PIPEFY_GRAPHQL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query: CARD_QUERY, variables: { id: cardId } }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Pipefy API: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();

  if (json.errors?.length) {
    const msg = json.errors.map((e: { message: string }) => e.message).join("; ");
    throw new Error(`Pipefy GraphQL: ${msg}`);
  }

  return json.data?.card ?? null;
}

function parseCardId(url: string): string {
  const openCard = url.match(/open-cards\/(\d+)/i);
  if (openCard) return openCard[1];

  const pipeCard = url.match(/[#/]cards?\/(\d+)/i);
  if (pipeCard) return pipeCard[1];

  const fallback = url.match(/(\d{6,})/);
  if (fallback) return fallback[1];

  throw new Error(
    "Não foi possível extrair o ID do card da URL. Use o formato https://app.pipefy.com/open-cards/ID"
  );
}

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function hasLabel(labels: { name: string }[], ...terms: string[]): boolean {
  return labels.some((l) =>
    terms.some((t) => l.name.toLowerCase().includes(t.toLowerCase()))
  );
}

function buildObservacao(
  phase: string | null,
  notifications: number,
  retorno: "Sim" | "Não",
  lastComm: string | null,
  labels: { name: string }[]
): string {
  const parts: string[] = [];

  if (phase) parts.push(`Fase atual: ${phase}.`);

  if (notifications > 0) {
    parts.push(`${notifications} notificação${notifications > 1 ? "ões" : ""} enviada${notifications > 1 ? "s" : ""}.`);
  } else {
    parts.push("Nenhuma notificação registrada.");
  }

  parts.push(retorno === "Sim" ? "Houve retorno do agressor." : "Sem retorno do agressor.");

  if (lastComm) parts.push(`Última comunicação: ${lastComm}.`);

  const priority = hasLabel(labels, "hotline", "prioridade");
  if (priority) parts.push("Caso prioritário.");

  let result = parts.join(" ");
  if (result.length > 200) result = result.slice(0, 197) + "...";
  return result;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cardUrl, pipefyToken } = body as {
      cardUrl: string;
      pipefyToken?: string;
    };

    const token = pipefyToken?.trim() || process.env.PIPEFY_API_TOKEN || "";
    if (!token) {
      return NextResponse.json(
        {
          error:
            "Token do Pipefy não configurado. Insira seu token pessoal ou configure PIPEFY_API_TOKEN no .env.local.",
        },
        { status: 400 }
      );
    }

    if (!cardUrl?.trim()) {
      return NextResponse.json({ error: "URL do card não fornecida." }, { status: 400 });
    }

    let cardId: string;
    try {
      cardId = parseCardId(cardUrl);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "URL inválida." },
        { status: 400 }
      );
    }

    let card;
    try {
      card = await fetchCard(cardId, token);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao buscar card.";
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    if (!card) {
      return NextResponse.json(
        {
          error:
            "Card não encontrado. Verifique a URL e se o token tem acesso a esse card.",
        },
        { status: 404 }
      );
    }

    const labels: { name: string }[] = card.labels ?? [];

    // 1. Nome do agressor
    const nomeAgressor: string = card.title ?? "";

    // 2. Etiqueta Top Leilão
    const etiquetaTopLeilao = hasLabel(labels, "top leilão", "top leilao")
      ? "Ativada"
      : "Não ativada";

    // 3. Notificações enviadas — conta entradas de fase "Quarentena"
    const notificacoesEnviadas: number = (card.phases_history ?? []).filter(
      (h: { phase: { name: string } }) =>
        h.phase?.name?.toLowerCase().includes("quarentena")
    ).length;

    // 4. Última comunicação
    const comments: { created_at: string }[] = card.comments ?? [];
    let ultimaComunicacao: string | null = null;
    if (comments.length > 0) {
      const latest = comments.reduce((a, b) =>
        new Date(a.created_at) > new Date(b.created_at) ? a : b
      );
      ultimaComunicacao = formatDate(latest.created_at);
    }

    // 5. Retorno
    const retorno = hasLabel(labels, "respondeu", "respondido", "confirmou a negativação")
      ? "Sim"
      : "Não";

    // 6. Observação
    const observacao = buildObservacao(
      card.current_phase?.name ?? null,
      notificacoesEnviadas,
      retorno,
      ultimaComunicacao,
      labels
    );

    return NextResponse.json({
      success: true,
      data: {
        nomeAgressor,
        etiquetaTopLeilao,
        notificacoesEnviadas,
        ultimaComunicacao,
        retorno,
        observacao,
      },
    });
  } catch (error) {
    console.error("resumo-tratativa error:", error);
    const msg = error instanceof Error ? error.message : "Erro desconhecido.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
