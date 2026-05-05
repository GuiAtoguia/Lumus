import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  PRESENTATION_SYSTEM_PROMPT,
  buildPresentationPrompt,
  type SlideChartType,
} from "@/lib/apresentacao-prompt";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const MODEL_ID = "gemini-2.5-flash";

const VALID_TYPES: SlideChartType[] = [
  "branddi_score",
  "agressores_total",
  "agressores_semanal",
  "termos_composto",
  "termos_puro",
  "share_keyword",
  "share_agressor",
  "trademark_evidencia",
  "trademark_aprovacao",
  "heatmap",
  "evolucao_agressividade",
  "cpc",
  "ctr",
  "parcela_impressao",
  "impressao_1a_posicao",
  "impressao_parte_superior",
  "saving",
];

export async function POST(request: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { success: false, error: "GEMINI_API_KEY não configurada." },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("image") as File | null;
    const chartType = formData.get("chartType") as string;

    if (!file) {
      return NextResponse.json({ success: false, error: "Imagem não fornecida." }, { status: 400 });
    }
    if (!VALID_TYPES.includes(chartType as SlideChartType)) {
      return NextResponse.json({ success: false, error: "Tipo de gráfico inválido." }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const rawType = file.type || "image/png";
    const mimeType = ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(rawType)
      ? rawType
      : "image/png";

    const model = genAI.getGenerativeModel({
      model: MODEL_ID,
      systemInstruction: PRESENTATION_SYSTEM_PROMPT,
      generationConfig: { temperature: 0.7, responseMimeType: "application/json" },
    });

    let result;
    try {
      result = await model.generateContent([
        { inlineData: { mimeType: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp", data: base64 } },
        { text: buildPresentationPrompt(chartType as SlideChartType) },
      ]);
    } catch (apiError) {
      const apiMsg = apiError instanceof Error ? apiError.message : String(apiError);
      if (apiMsg.includes("API_KEY_INVALID")) {
        return NextResponse.json({ success: false, error: "Chave Gemini inválida." }, { status: 401 });
      }
      if (apiMsg.includes("429") || apiMsg.includes("RESOURCE_EXHAUSTED")) {
        return NextResponse.json({ success: false, error: "Limite gratuito atingido. Aguarde 1min." }, { status: 429 });
      }
      return NextResponse.json({ success: false, error: `Erro IA: ${apiMsg}` }, { status: 502 });
    }

    const rawText = result.response.text();
    const cleaned = rawText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    let parsed: { exemplo1: string; exemplo2: string };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { success: false, error: "Formato inesperado da IA. Tente regenerar.", rawResponse: rawText.slice(0, 500) },
        { status: 502 }
      );
    }

    if (!parsed.exemplo1 || !parsed.exemplo2) {
      return NextResponse.json({ success: false, error: "JSON incompleto." }, { status: 502 });
    }

    return NextResponse.json({ success: true, data: parsed });
  } catch (error) {
    console.error("analyze-presentation-chart error:", error);
    const msg = error instanceof Error ? error.message : "Erro desconhecido.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
