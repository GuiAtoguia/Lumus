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
    const cardFields: { field: { id: string; label: string; type: string }; value: string }[] = card.fields ?? [];

    const nomeAgressor: string = card.title ?? "";

    const etiquetaTopLeilao: "Sim" | "Não" = labelNames.some((l) =>
      l.toLowerCase().includes("top leilão") || l.toLowerCase().includes("top leilao")
    ) ? "Sim" : "Não";

    // Notificações: 1) campo numérico do card, 2) fases, 3) comentários com menção a notificação
    const notifNumField = cardFields.find(
      (f) =>
        /notifica[çc][aã]o|n[uú]mero.*contato|contato.*n[uú]mero|qtd|quantidade/i.test(f.field?.label ?? "") &&
        /^\d+$/.test((f.value ?? "").trim())
    );

    let notificacoesEnviadas: number;
    if (notifNumField) {
      notificacoesEnviadas = parseInt(notifNumField.value.trim(), 10);
    } else {
      // Conta entradas de fases de notificação (cada visita à fase = 1 notificação)
      const notifTerms = ["quarentena", "notif", "aguardando retorno", "enviado"];
      const byPhase = phasesHistory.filter((h) =>
        notifTerms.some((t) => h.phase?.name?.toLowerCase().includes(t))
      ).length;

      if (byPhase > 0) {
        notificacoesEnviadas = byPhase;
      } else {
        // Fallback: conta comentários que registram envio de notificação
        const notifCommentRe = /notifica[çc][aã]o\s*\d+|^\d+[aª°]\s*notifica|enviamos|email enviado|contato\s+via/i;
        notificacoesEnviadas = (card.comments ?? []).filter(
          (c: { text: string }) => notifCommentRe.test(c.text)
        ).length;
      }
    }

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

    const hasHotline = labelNames.some((l) =>
      l.toLowerCase().includes("hotline") || l.toLowerCase().includes("prioridade")
    );

    const hasNE = sortedComments.some((c: { text: string }) =>
      /notifica[çc][aã]o extrajudicial|ne branddi|\bne\b/i.test(c.text)
    );

    const recentComments = sortedComments
      .slice(0, 6)
      .map(
        (c: { text: string; created_at: string; author?: { name: string } }) =>
          `[${c.created_at.slice(0, 10)}] ${c.author?.name ?? "—"}: ${c.text.slice(0, 180)}`
      )
      .join("\n");

    // ── Groq: apenas para a observação ───────────────────────────────────────

    const prompt = `Você é um analista da Branddi Monitor especializado em brand bidding.
Escreva APENAS o campo "observacao" para um resumo de tratativa.

DADOS VERIFICADOS DO CARD:
- Agressor: ${nomeAgressor}
- Fase atual: ${card.current_phase?.name ?? "—"}
- Etiquetas ativas: ${labelNames.join(", ") || "nenhuma"}
- Reincidente (voltou após sucesso): ${reincidente ? "SIM" : "NÃO"}
- Hotline ou Prioridade ativo: ${hasHotline ? "SIM" : "NÃO — NÃO EXISTE hotline neste caso"}
- NE (Notificação Extrajudicial) enviada: ${hasNE ? "SIM" : "NÃO"}
- Retorno do agressor: ${retorno === "Sim" ? "SIM — o agressor respondeu" : "NÃO — o agressor NÃO respondeu"}
- Comentários recentes:
${recentComments || "Nenhum comentário"}

REGRAS ABSOLUTAS (violação = resposta inválida):
${reincidente ? '1. INICIE com "Agressor reincidente."' : "1. NÃO mencione reincidência"}
2. Máximo 200 caracteres
3. Mencione APENAS o canal identificado nos comentários acima (email, LinkedIn, telefone)
4. ${retorno === "Sim" ? "Mencione que o agressor respondeu e o que foi dito" : "JAMAIS diga que o agressor respondeu, retornou ou confirmou algo — ele NÃO respondeu"}
5. ${hasHotline ? "Mencione Hotline/Prioridade como ponto positivo" : "JAMAIS mencione hotline, prioridade ou canal diferenciado — este caso NÃO TEM hotline"}
6. ${hasNE ? 'Mencione "tratativa em tom mais formal" ao referir a NE' : ""}
7. JAMAIS escreva "quarentena" ou "ciclo"
8. JAMAIS invente datas, eventos ou informações que não estejam nos comentários acima
9. Linguagem profissional, direta. Sem frases genéricas como "aguardando retorno" sem contexto
10. Uma linha apenas, sem aspas, sem JSON, sem explicações extras

Exemplos de formato correto:
Abordagem direcionada aos e-mails mapeados. Sem novas ocorrências desde a última ação.
O contato demonstrou receptividade e solicitou evidências. Material enviado, aguardando confirmação.
Agressor reincidente. Recontato realizado via LinkedIn. Sem resposta até o momento.`;

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
    });
  } catch (error) {
    console.error("resumo-tratativa error:", error);
    const msg = error instanceof Error ? error.message : "Erro desconhecido.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
