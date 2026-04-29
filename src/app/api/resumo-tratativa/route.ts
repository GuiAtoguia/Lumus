import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

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
  // https://app.pipefy.com/open-cards/594136233
  const openCard = url.match(/open-cards\/(\d+)/i);
  if (openCard) return openCard[1];

  // https://app.pipefy.com/pipes/123#cards/456
  const pipeCard = url.match(/[#/]cards?\/(\d+)/i);
  if (pipeCard) return pipeCard[1];

  // Last long numeric segment as fallback
  const fallback = url.match(/(\d{6,})/);
  if (fallback) return fallback[1];

  throw new Error(
    "Não foi possível extrair o ID do card da URL. Use o formato https://app.pipefy.com/open-cards/ID"
  );
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

    // Sort comments newest first
    const sortedComments = [...(card.comments ?? [])].sort(
      (a: { created_at: string }, b: { created_at: string }) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const context = {
      title: card.title,
      current_phase: card.current_phase?.name ?? null,
      done: card.done,
      created_at: card.created_at,
      updated_at: card.updated_at,
      due_date: card.due_date,
      labels: (card.labels ?? []).map((l: { name: string; color: string }) => ({
        name: l.name,
        color: l.color,
      })),
      comments: sortedComments
        .slice(0, 15)
        .map((c: { text: string; created_at: string; author?: { name: string } }) => ({
          text: c.text,
          created_at: c.created_at,
          author: c.author?.name ?? "—",
        })),
      phases_history: (card.phases_history ?? []).map(
        (h: {
          phase: { name: string };
          firstTimeIn: string;
          lastTimeIn: string;
          duration: number;
        }) => ({
          phase_name: h.phase?.name,
          firstTimeIn: h.firstTimeIn,
          lastTimeIn: h.lastTimeIn,
          duration_seconds: h.duration,
        })
      ),
      fields: (card.fields ?? [])
        .filter((f: { value: string | null }) => f.value !== null && f.value !== "")
        .map((f: { field: { label: string }; value: string }) => ({
          label: f.field?.label,
          value: f.value,
        })),
    };

    const prompt = `Você é um analista da Branddi Monitor especializado em negativações de marca (brand bidding).
Analise os dados abaixo de um card do Pipefy e preencha cada campo com precisão.

DADOS DO CARD:
${JSON.stringify(context, null, 2)}

INSTRUÇÕES:

1. nomeAgressor: Use exatamente o valor de "title".

2. etiquetaTopLeilao: Verifique se existe alguma label cujo "name" contenha "Top Leilão" (ignore maiúsculas/minúsculas). Retorne "Ativada" ou "Não ativada".

3. notificacoesEnviadas: Analise "phases_history" e conte quantas entradas possuem um "phase_name" que contenha a palavra "Quarentena" (ignore maiúsculas/minúsculas). Retorne o número (0 se nenhuma).

4. ultimaComunicacao: Encontre a data mais recente entre todos os "comments[].created_at". Converta para o formato DD/MM/AAAA. Retorne null se não houver comentários.

5. retorno: Verifique se alguma label tem "name" contendo "Respondeu", "Respondido" ou "Confirmou a negativação" (ignore maiúsculas/minúsculas). Retorne "Sim" ou "Não".

6. observacao: Escreva um resumo estratégico em PORTUGUÊS CORRETO com EXATAMENTE NO MÁXIMO 200 caracteres. Baseie-se apenas nos dados reais (comentários, etiquetas, fase atual). Destaque: trabalho realizado, canais utilizados, se houve retorno, período sem ocorrências. Se houver labels como "Hotline" ou "Prioridade", mencione como ponto positivo. NUNCA invente dados. Não cite ferramentas ou sistemas pelo nome.

Retorne SOMENTE um JSON válido, sem markdown, sem explicações:
{
  "nomeAgressor": "string",
  "etiquetaTopLeilao": "Ativada" | "Não ativada",
  "notificacoesEnviadas": number,
  "ultimaComunicacao": "DD/MM/AAAA" | null,
  "retorno": "Sim" | "Não",
  "observacao": "string"
}`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
    const result_ai = await model.generateContent(prompt);
    const rawText = result_ai.response.text();

    let result: unknown;
    try {
      const clean = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      result = JSON.parse(clean);
    } catch {
      return NextResponse.json({
        success: false,
        error: "A IA não retornou um JSON válido. Tente novamente.",
        rawResponse: rawText,
      });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("resumo-tratativa error:", error);
    const msg = error instanceof Error ? error.message : "Erro desconhecido.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
