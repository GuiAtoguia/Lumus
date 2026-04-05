import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const images = formData.getAll("images") as File[];
    const clientName = formData.get("clientName") as string;

    if (!images.length) {
      return NextResponse.json(
        { error: "Nenhuma imagem fornecida" },
        { status: 400 }
      );
    }

    // Convert image to base64
    const file = images[0];
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const mimeType = (
      file.type.startsWith("image/") ? file.type : "image/png"
    ) as "image/jpeg" | "image/png" | "image/gif" | "image/webp";

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

    const prompt = `Você é um analista especialista em Brand Bidding da Branddi Monitor.

Analise o print do dashboard Branddi acima e extraia TODOS os dados visíveis.
Cliente: ${clientName || "não informado"}

IMPORTANTE — Identifique o período automaticamente olhando as datas visíveis no gráfico ou no dashboard:
- Se o intervalo de datas for de aproximadamente 7 dias → reportType = "Semanal", periodDays = 7
- Se o intervalo for de aproximadamente 14 dias ou duas semanas → reportType = "Quinzenal", periodDays = 14
- Se não conseguir determinar, use reportType = "Quinzenal" e periodDays = 14

Retorne APENAS um JSON válido com a estrutura abaixo. Não inclua markdown, não inclua explicações, apenas o JSON puro:

{
  "reportType": "Semanal" ou "Quinzenal",
  "periodDays": <7 ou 14>,
  "periodLabel": "<ex: '01 Mar - 14 Mar' ou '08 Mar - 14 Mar', conforme visível no print>",
  "metrics": {
    "identificados": <número ou null>,
    "inativos": <número ou null>,
    "ocorrencias": <número ou null>,
    "notificados": <número ou null>,
    "eliminados": <número ou null>,
    "notificacoesEnviadas": <número ou null>
  },
  "agressores": {
    "novos": <número de novos no período ou null>,
    "total": <número total ativo ou null>
  },
  "heatmap": [
    {"nome": "<domínio>", "score": "<score como string, ex: '10.00'>"}
  ],
  "section1Text": "A tabela a seguir resume os principais indicadores de Brand Bidding da última semana.",
  "section2Text": "<parágrafo completo sobre agressores. Formato: 'Durante as últimas [duas semanas / semana], foram identificados X novos agressores, elevando o total para Y agressores ativos no período.' — use os números extraídos da imagem>",
  "section3Text": "<análise completa do heatmap. Destaque: qual agressor teve maior agressividade e o valor do score, em qual fase de tratativa está (se visível), quais compõem o top 3 e como estão classificados. Seja específico com os dados da imagem.>"
}

Se um número não estiver visível, use null. Se uma string não puder ser determinada, use um placeholder descritivo entre colchetes.`;

    const result = await model.generateContent([
      { inlineData: { mimeType, data: base64 } },
      prompt,
    ]);

    const responseText = result.response.text();

    // Parse JSON response — handle potential markdown wrapping
    let extractedData;
    try {
      const cleanJson = responseText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      extractedData = JSON.parse(cleanJson);
    } catch {
      return NextResponse.json({
        success: false,
        error: "Não foi possível interpretar a resposta da IA. Preencha os dados manualmente.",
        rawResponse: responseText,
        parseError: true,
      });
    }

    return NextResponse.json({
      success: true,
      data: extractedData,
    });
  } catch (error) {
    console.error("Brand Bidding report error:", error);

    if (
      error instanceof Error &&
      (error.message.includes("API key") ||
        error.message.includes("API_KEY") ||
        error.message.includes("401") ||
        error.message.includes("403"))
    ) {
      return NextResponse.json(
        { error: "Chave de API não configurada. Configure GEMINI_API_KEY no .env.local" },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Erro ao analisar imagem. Tente novamente." },
      { status: 500 }
    );
  }
}
