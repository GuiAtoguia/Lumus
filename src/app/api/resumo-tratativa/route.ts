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

    // ── Groq: apenas para a observação ───────────────────────────────────────

    const prompt = `Você é um especialista em comunicação de proteção de marca, responsável por redigir atualizações de tratativas.
Narre de forma humanizada e profissional o status do caso — como se estivesse contando uma história de acompanhamento próximo e comprometido.

DADOS DO CASO:
- Reincidente: ${reincidente ? "SIM" : "NÃO"}
- Retorno do agressor: ${retorno === "Sim" ? "SIM — respondeu" : "NÃO — não respondeu"}
- Última ocorrência registrada: ${ultimaOcorrencia ?? "não informada"}
- Comentários recentes (base principal — extraia: data, canal, ações, resultado):
${recentComments || "Nenhum comentário"}

━━ O QUE DEVE APARECER ━━
• A tentativa de contato mais recente: quando foi e por qual canal (e-mail, WhatsApp, LinkedIn, hotline)
• ${retorno === "Sim" ? "Houve retorno: descreva brevemente o que foi indicado e o encaminhamento" : "Não houve retorno: mencione que aguardamos posicionamento"}
• ${ultimaOcorrencia ? `Informe: "última ocorrência registrada em ${ultimaOcorrencia}"` : ""}
• ${reincidente ? "Mencione que o agressor é reincidente e que o caso é tratado com atenção prioritária" : ""}
• Finalize com o status atual: aguardando retorno / monitorando / em regarimpo para nova tentativa

━━ O QUE NUNCA PODE APARECER ━━
• "NE", "notificação extrajudicial", "ação jurídica", "advogado" ou qualquer termo legal
• Nomes de clientes, marcas de terceiros, produtos ou empresas citadas nos comentários
• "ciclo 1", "ciclo 2", "última tentativa" ou qualquer numeração de ciclo interno
• Domínios, endereços de e-mail ou nomes de pessoas
• Nomes de empresa como "Branddi Monitor" ou similar
• Linguagem fria: "conforme protocolo", "procedimento padrão", "SLA"

━━ TOM E ESTILO ━━
• Humanizado, direto e profissional
• Primeira pessoa do plural ("nosso time", "enviamos", "retomamos") OU relato de ação ("foi realizada", "efetuamos")
• COMECE diretamente com a ação ou data — sem introdução, sem título, sem "Atualização:"
• Máximo 200 caracteres — frases curtas, sem repetição
• APENAS texto simples: sem asteriscos, sem negrito, sem Markdown, sem JSON, sem aspas`;

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
