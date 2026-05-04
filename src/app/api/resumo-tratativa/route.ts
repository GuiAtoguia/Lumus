import { NextRequest, NextResponse } from "next/server";

const PIPEFY_GRAPHQL = "https://api.pipefy.com/graphql";
const GROQ_API = "https://api.groq.com/openai/v1/chat/completions";

const CARD_QUERY = `
  query GetCard($id: ID!) {
    card(id: $id) {
      id
      title
      current_phase { id name }
      labels { id name color }
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

  if (!res.ok) throw new Error(`Pipefy API: ${res.status} ${res.statusText}`);

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cardUrl, pipefyToken } = body as { cardUrl: string; pipefyToken?: string };

    const token = pipefyToken?.trim() || process.env.PIPEFY_API_TOKEN || "";
    if (!token) {
      return NextResponse.json(
        { error: "Token do Pipefy não configurado." },
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
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Erro ao buscar card." },
        { status: 502 }
      );
    }

    if (!card) {
      return NextResponse.json(
        { error: "Card não encontrado. Verifique a URL e se o token tem acesso a esse card." },
        { status: 404 }
      );
    }

    const groqKey = process.env.GROQ_API_KEY || "";
    if (!groqKey) {
      return NextResponse.json({ error: "GROQ_API_KEY não configurada." }, { status: 500 });
    }

    // ── Campos determinísticos (código puro, sem IA) ──────────────────────────

    const labelNames: string[] = (card.labels ?? []).map((l: { name: string }) => l.name);
    const phasesHistory: { phase: { name: string }; firstTimeIn: string }[] = card.phases_history ?? [];
    const nomeAgressor: string = card.title ?? "";

    // "top leilão off" ou "top leilão - off" = inativo; só ativo se SEM "off"/"inativo"
    const etiquetaTopLeilao: "Sim" | "Não" = labelNames.some((l) => {
      const lower = l.toLowerCase().replace(/[-–_]/g, " ");
      const hasTopLeilao = lower.includes("top leilão") || lower.includes("top leilao");
      const isOff = lower.includes("off") || lower.includes("inativo") || lower.includes("inativa");
      return hasTopLeilao && !isOff;
    }) ? "Sim" : "Não";

    // Notificações: conta fases de outreach (tentativa, hotline, prioridade)
    // Exclui fases de espera (quarentena) e internas (aprovação, ocorrências, sucesso)
    const notificacoesEnviadas: number = phasesHistory.filter((h) => {
      const name = h.phase?.name?.toLowerCase() ?? "";
      const isOutreach =
        (name.includes("tentativa") && !name.includes("quarentena")) ||
        name.includes("hotline") ||
        name.includes("prioridade");
      return isOutreach;
    }).length;

    // Debug: nomes de todas as fases retornadas pelo Pipefy
    const _debugPhases = phasesHistory.map((h) => h.phase?.name ?? "?");

    const sortedComments = [...(card.comments ?? [])].sort(
      (a: { created_at: string }, b: { created_at: string }) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const ultimaComunicacao: string | null =
      sortedComments.length > 0 ? formatDate(sortedComments[0].created_at) : null;

    const retorno: "Sim" | "Não" = labelNames.some((l) =>
      ["respondeu", "respondido", "confirmou a negativação"].some((t) =>
        l.toLowerCase().includes(t)
      )
    ) ? "Sim" : "Não";

    // ── Contexto extra para a observação ─────────────────────────────────────

    const reincidente = phasesHistory.some((h) =>
      h.phase?.name?.toLowerCase().includes("sucesso")
    );

    const recentComments = sortedComments
      .slice(0, 6)
      .map(
        (c: { text: string; created_at: string; author?: { name: string } }) =>
          `[${c.created_at.slice(0, 10)}] ${c.author?.name ?? "—"}: ${c.text.slice(0, 180)}`
      )
      .join("\n");

    // ── Groq: apenas para a observação ───────────────────────────────────────

    const prompt = `Você é um analista da Branddi Monitor escrevendo o campo "observacao".
Conte uma breve narrativa da tratativa em primeira pessoa do plural (nós = time Branddi Monitor).

CONTEXTO DO CARD:
- Agressor: ${nomeAgressor}
- Reincidente: ${reincidente ? "SIM" : "NÃO"}
- Retorno do agressor: ${retorno === "Sim" ? "SIM — o agressor respondeu" : "NÃO — o agressor não respondeu"}
- Comentários recentes (use para extrair datas, canal e ações realizadas):
${recentComments || "Nenhum comentário"}

REGRAS:
- Máximo 200 caracteres
- Mencione a data da ação mais recente (ex: "em 20/04/2026"), o canal (e-mail, hotline, LinkedIn) e o status
- ${retorno === "Sim" ? "Mencione que recebemos retorno do agressor" : "Mencione que não houve retorno"}
- ${reincidente ? "Mencione que o agressor é reincidente" : "NÃO mencione reincidência"}
- JAMAIS mencione endereços de e-mail, nomes de pessoas ou domínios completos
- JAMAIS mencione que existe um cliente, empresa cliente ou relação com cliente — escreva como se a Branddi estivesse tratando diretamente
- JAMAIS invente datas ou ações que não apareçam nos comentários
- JAMAIS mencione o que foi discutido em detalhes (produto, marca, termo específico)
- JAMAIS escreva "quarentena" ou "ciclo"
- Uma frase ou duas, sem aspas, sem JSON

EXEMPLOS (siga este estilo exato):
Em 26/01, foi enviado e-mail à equipe responsável solicitando negativação, com envio de evidências. Aguardamos retorno.
Nova tentativa de contato enviada em 20/04/2026. Sem retorno, mantendo atenção no caso e monitorando as ocorrências.
Efetuada nova tentativa com hotline em 17/04/2026. Nosso time realiza regarimpo para nova tentativa.
Foi realizada a primeira tentativa de contato via e-mail ao contato garimpado. Ainda não tivemos retorno.
Realizada 3ª tentativa de comunicação. Agressor reincidente; recebemos retorno e nosso time se prepara para próxima ação.`;

    const groqRes = await fetch(GROQ_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 120,
        temperature: 0.2,
      }),
    });

    if (!groqRes.ok) {
      const err = await groqRes.text();
      throw new Error(`Groq API: ${groqRes.status} — ${err}`);
    }

    const groqData = await groqRes.json();
    let observacao: string = groqData.choices?.[0]?.message?.content?.trim() ?? "";
    observacao = observacao.replace(/^["']|["']$/g, "");
    if (observacao.length > 200) observacao = observacao.slice(0, 197) + "...";

    return NextResponse.json({
      success: true,
      data: { nomeAgressor, etiquetaTopLeilao, notificacoesEnviadas, ultimaComunicacao, retorno, observacao },
      _debug: { phases: _debugPhases, notificacoesCount: notificacoesEnviadas },
    });
  } catch (error) {
    console.error("resumo-tratativa error:", error);
    const msg = error instanceof Error ? error.message : "Erro desconhecido.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
