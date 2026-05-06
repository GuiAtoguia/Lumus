import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const PIPEFY_GRAPHQL = "https://api.pipefy.com/graphql";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const is503 = msg.includes("503") || msg.includes("Service Unavailable") || msg.includes("overloaded") || msg.includes("high demand");
      if (is503 && attempt < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Max retries exceeded");
}

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

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY não configurada." }, { status: 500 });
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

    // Notificações: conta fases de outreach distintas (deduplicado por nome de fase)
    // "N1. 1a Tentativa", "N1. 2a Tentativa", "N2. Hotline" = 3 notificações
    // "N2. Hotline" visitado 2x ainda conta como 1 (mesma fase, ida e volta)
    const notificacoesEnviadas: number = new Set(
      phasesHistory
        .filter((h) => {
          const name = h.phase?.name?.toLowerCase() ?? "";
          return (
            (name.includes("tentativa") || name.includes("hotline") || name.includes("prioridade")) &&
            !name.includes("quarentena")
          );
        })
        .map((h) => h.phase?.name ?? "")
    ).size;

    // Debug: nomes de fases e campos do card
    const _debugPhases = phasesHistory.map((h) => h.phase?.name ?? "?");
    const _debugFields = (card.fields ?? []).map((f: { field: { label: string }; value: string; date_value: string }) => ({
      label: f.field?.label,
      value: f.value,
      date_value: f.date_value,
    }));

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

    // Campo "Data da última vez que apareceu no relatório" (ou similar)
    const cardFields: { field: { label: string }; value: string; date_value: string }[] = card.fields ?? [];
    const ultimaOcorrenciaField = cardFields.find((f) =>
      /[úu]ltim|ocorr[êe]ncia|apareceu|relat[óo]rio/i.test(f.field?.label ?? "")
    );
    const ultimaOcorrencia: string | null =
      ultimaOcorrenciaField?.date_value
        ? formatDate(ultimaOcorrenciaField.date_value)
        : ultimaOcorrenciaField?.value
        ? ultimaOcorrenciaField.value
        : null;

    const recentComments = sortedComments
      .slice(0, 6)
      .map(
        (c: { text: string; created_at: string; author?: { name: string } }) =>
          `[${c.created_at.slice(0, 10)}] ${c.author?.name ?? "—"}: ${c.text.slice(0, 180)}`
      )
      .join("\n");

    // ── Gemini: apenas para a observação ─────────────────────────────────────

    const prompt = `Você é um especialista em comunicação de proteção de marca. Escreva o campo "observacao" de uma tratativa.

DADOS:
- Reincidente: ${reincidente ? "SIM" : "NÃO"}
- Retorno do agressor: ${retorno === "Sim" ? "SIM — respondeu" : "NÃO — não respondeu"}
- Última ocorrência registrada: ${ultimaOcorrencia ?? "não informada"}
- Comentários (extraia data, canal e o que aconteceu):
${recentComments || "Nenhum comentário"}

ESTRUTURA OBRIGATÓRIA:
1. Comece com a ação/evento mais recente + data (extraia dos comentários)
2. ${retorno === "Sim" ? "Descreva brevemente o que o agressor respondeu/alegou" : "Informe que aguarda-se posicionamento ou que não houve retorno"}
3. ${reincidente ? "Mencione que é reincidente" : ""}
4. ${ultimaOcorrencia ? `Finalize SEMPRE com: "A última ocorrência registrada foi no dia ${ultimaOcorrencia}."` : "Finalize com o status atual (aguardando retorno / monitorando)"}

NUNCA mencione: e-mails, nomes de pessoas, domínios, marcas/produtos, "Branddi Monitor", "ciclo", "quarentena", termos jurídicos, Markdown ou asteriscos.
Texto simples, sem título, sem aspas. Pode ter mais de uma frase — escreva tudo que for relevante.

EXEMPLOS REAIS (siga este estilo exato):
No ultimo contato realizado em 29/04, tivemos um retorno do agressor alegando que não identificaram ocorrências nos testes realizados. Aguarda-se posicionamento e a última ocorrência registrada foi no dia 01/05/2026.
No dia 22/04/2026 recebemos a confirmação da negativação. A última ocorrência registrada foi no dia 16/04/2026.
Reforçamos o pedido em 30/04/2026 direto com hotline e seguimos aguardando um novo retorno. A última ocorrência registrada foi no dia 02/05/2026.`;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { temperature: 0.2, maxOutputTokens: 1500 },
    });

    const result = await withRetry(() => model.generateContent(prompt));
    let observacao: string = result.response.text().trim();
    observacao = observacao.replace(/^["']|["']$/g, "");

    return NextResponse.json({
      success: true,
      data: { nomeAgressor, etiquetaTopLeilao, notificacoesEnviadas, ultimaComunicacao, retorno, observacao },
      _debug: { phases: _debugPhases, notificacoesCount: notificacoesEnviadas, fields: _debugFields },
    });
  } catch (error) {
    console.error("resumo-tratativa error:", error);
    const msg = error instanceof Error ? error.message : "Erro desconhecido.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
