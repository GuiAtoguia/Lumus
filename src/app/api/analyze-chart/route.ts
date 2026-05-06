import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  ANALYST_SYSTEM_PROMPT,
  buildUserPrompt,
} from "@/lib/chart-analyst-prompt";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

type ChartType = "agressores" | "heatmap" | "metricas";

const MODEL_ID = "gemini-2.5-flash";

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

export async function POST(request: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error:
            "GEMINI_API_KEY não configurada. Adicione em Settings → Environment Variables na Vercel e faça redeploy.",
        },
        { status: 503 }
      );
    }

    const contentType = request.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");

    const model = genAI.getGenerativeModel({
      model: MODEL_ID,
      systemInstruction: ANALYST_SYSTEM_PROMPT,
      generationConfig: { temperature: 0.7, responseMimeType: "application/json" },
    });

    let result;
    try {
      if (isJson) {
        // Chamada sem imagem (ex: análise dos Big Numbers com texto)
        const body = await request.json() as { textPrompt?: string; chartType?: string };
        if (!body.textPrompt) {
          return NextResponse.json({ success: false, error: "textPrompt não fornecido." }, { status: 400 });
        }
        result = await withRetry(() => model.generateContent(body.textPrompt!));
      } else {
        // Chamada com imagem (FormData)
        const formData = await request.formData();
        const file = formData.get("image") as File | null;
        const chartType = (formData.get("chartType") as string) as ChartType;

        if (!file) {
          return NextResponse.json({ success: false, error: "Imagem não fornecida." }, { status: 400 });
        }
        if (chartType !== "agressores" && chartType !== "heatmap") {
          return NextResponse.json({ success: false, error: "Tipo de gráfico inválido." }, { status: 400 });
        }

        const buffer = await file.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        const rawType = file.type || "image/png";
        const mimeType = ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(rawType)
          ? rawType
          : "image/png";

        result = await withRetry(() => model.generateContent([
          { inlineData: { mimeType, data: base64 } },
          { text: buildUserPrompt(chartType as "agressores" | "heatmap") },
        ]));
      }
    } catch (apiError) {
      const apiMsg = apiError instanceof Error ? apiError.message : String(apiError);

      if (apiMsg.includes("API_KEY_INVALID") || apiMsg.includes("API key not valid")) {
        return NextResponse.json(
          { success: false, error: "Chave da API do Gemini inválida. Confira o valor em Settings → Environment Variables." },
          { status: 401 }
        );
      }
      if (apiMsg.includes("PERMISSION_DENIED") || apiMsg.includes("403")) {
        return NextResponse.json(
          { success: false, error: "Sem permissão pra usar este modelo. A chave pode estar restrita a domínios específicos no Google AI Studio." },
          { status: 403 }
        );
      }
      if (apiMsg.includes("429") || apiMsg.includes("RESOURCE_EXHAUSTED")) {
        return NextResponse.json(
          { success: false, error: "Limite gratuito do Gemini atingido (15 req/min). Aguarde 1 minuto e tente de novo." },
          { status: 429 }
        );
      }
      if (apiMsg.includes("503") || apiMsg.includes("Service Unavailable") || apiMsg.includes("overloaded") || apiMsg.includes("high demand")) {
        return NextResponse.json(
          { success: false, error: "O Gemini está sobrecarregado agora (503). Aguarde alguns segundos e clique em Gerar novamente." },
          { status: 503 }
        );
      }
      if (apiMsg.includes("not found") || apiMsg.includes("NOT_FOUND")) {
        return NextResponse.json(
          { success: false, error: `Modelo ${MODEL_ID} não disponível pra essa chave. Tente gerar uma nova chave em aistudio.google.com/apikey.` },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { success: false, error: `Erro ao chamar a IA: ${apiMsg}` },
        { status: 502 }
      );
    }

    const rawText = result.response.text();
    const cleaned = rawText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    let parsed: { exemplo1: string; exemplo2: string };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "A IA retornou um formato inesperado. Tente colar o gráfico de novo ou clique em 'Regenerar'.",
          rawResponse: rawText.slice(0, 500),
        },
        { status: 502 }
      );
    }

    if (!parsed.exemplo1 || !parsed.exemplo2) {
      return NextResponse.json(
        { success: false, error: "A IA não gerou as duas opções. Tente novamente.", rawResponse: rawText.slice(0, 500) },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, data: parsed });
  } catch (error) {
    console.error("analyze-chart error:", error);
    const msg = error instanceof Error ? error.message : "Erro desconhecido.";
    return NextResponse.json(
      { success: false, error: `Erro inesperado: ${msg}` },
      { status: 500 }
    );
  }
}
