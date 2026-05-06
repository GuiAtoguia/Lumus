// Gera apresentação .pptx mensal de Brand Bidding com TODOS os 30 slides
// seguindo o template Branddi.
import pptxgen from "pptxgenjs";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface BigNumbers {
  identificados: string;
  inativos: string;
  ocorrencias: string;
  notificados: string;
  resolvidos: string;
  notificacoesEnviadas: string;
}

export interface TratativaRow {
  agressor: string;
  agressividade: string;
  termos: string;
  topLeilao: "sim" | "nao" | "—";
  notificacoes: string;
  ultimaComunicacao: string;
  respondeu: "sim" | "nao" | "—";
  observacao: string;
}

export interface NegativacaoRow {
  agressor: string;
  data: string;
  observacao: string;
}

export interface EvolucaoRow {
  domain: string;
  mes1: string;
  mes2: string;
  mes3: string;
}

export interface ResolvidoEntry { domain: string; logoDataUrl?: string; }
export interface ProximoPasso { text: string; enabled: boolean; }

export type HeatmapIcon = "sucesso" | "whitelist" | "tratativa" | "parceiro" | "nenhum";

export interface HeatmapRow {
  icon: HeatmapIcon;
  domain: string;
}

export interface TrademarkEvidence {
  caption: string;
  imageDataUrl: string | null;
}

export interface MediacaoStep {
  text: string;
}

export interface CampanhaSlideData {
  keywordIs: string;
  keywordContains: string;
  inicioAtuacao: string;
  imageDataUrlIs: string | null;        // print do gráfico "Palavra-Chave É"
  imageDataUrlContains: string | null;  // print do gráfico "Palavra-Chave Contém"
  analysis: string;
}

export interface PresentationData {
  // Capa
  clientName: string;
  monthYear: string;

  // Big Numbers - Slide 3 (Toda parceria)
  bigNumbersTotal: BigNumbers;
  bigNumbersTotalAnalysis: string;
  economiaTotal: string;        // R$xx em notificações enviadas

  // Big Numbers - Slide 4 (Parceria + período mensal)
  bigNumbersMes: BigNumbers;
  periodoMes: string;           // "Apenas dezembro" / "Janeiro"
  taxaSucessoMes: string;       // calculado mas pode ser sobrescrito
  economiaMes: string;

  // Branddi Score - Slide 5
  branddiScoreImage: string | null;
  branddiScoreAnalysis: string;
  branddiScoreSideNote: string;  // detalhe em azul ao lado

  // Agressores - Slide 6 (total)
  agressoresTotalImage: string | null;
  agressoresTotalAnalysis: string;
  agressoresTotalSideNote: string;

  // Agressores - Slide 7 (semanal)
  agressoresSemanalImage: string | null;
  agressoresSemanalAnalysis: string;
  agressoresSemanalSideNote: string;

  // Análise de Termos - Slide 8 (composto + puro)
  termosCompostoImage: string | null;
  termoPuroImage: string | null;
  termosAnalysis: string;          // análise comparativa que fala dos dois juntos

  // Share - Slide 11 (keyword)
  shareKeywordImage: string | null;
  shareKeywordAnalysis: string;

  // Share - Slide 12 (agressor pizza)
  shareAgressorImage: string | null;
  shareAgressorAnalysis: string;
  shareAgressorAnalysis2: string;

  // Afiliados - Slide 12a
  afiliadosBarImage: string | null;

  // Análise de Bing - Slide 12b
  bingPizzaPlataformaImage: string | null;
  bingPizzaTermosImage: string | null;
  bingAnalysisPlataforma: string;
  bingAnalysisTermos: string;

  // Share Ocorrências Bing - Slide 12c
  bingShareBarImage: string | null;
  bingShareAnalysis: string;

  // Share Ocorrências Somente Concorrentes - Slide 12d
  concorrentesBarImage: string | null;
  concorrentesPizzaImage: string | null;
  concorrentesAnalysis: string;
  concorrentesAnalysisPizza: string;

  // Share Ocorrências Somente Whitelist - Slide 12e
  whitelistBarImage: string | null;
  whitelistPizzaImage: string | null;
  whitelistAnalysis: string;
  whitelistAnalysisPizza: string;

  // Trademark - Slide 13 (evidências)
  trademarkAgressores: string;
  trademarkOcorrencias: string;
  trademarkShareImage: string | null;
  trademarkAnalysis: string;
  trademarkEvidences: TrademarkEvidence[];

  // Trademark - Slide 14 (aprovação)
  trademarkAprovAgressores: string;
  trademarkAprovOcorrencias: string;
  trademarkAprovImage: string | null;
  trademarkAprovAnalysis: string;

  // Heatmap - Slide 15
  heatmapImage: string | null;
  heatmapAnalysis: string;
  heatmapRows: HeatmapRow[];

  // Evolução de agressividade - Slide 16
  evolucaoMeses: [string, string, string];  // headers
  evolucaoRows: EvolucaoRow[];
  evolucaoAnalysis: string;

  // Tratativas - Slide 17
  tratativas: TratativaRow[];

  // Tratativas - Slide 18 (termos atingidos)
  termosAtingidosRows: { agressor: string; termos: string }[];

  // Tratativa em Prioridade - Slide 19
  prioridadeAgressor: string;
  prioridadeTexto: string;
  prioridadeEvidenciaUrl: string;
  prioridadeMediacaoSteps: MediacaoStep[];

  // Negativações - Slide 20
  negativacoes: NegativacaoRow[];

  // Resolvidos - Slide 21
  resolvedTitle: string;
  resolved: ResolvidoEntry[];

  // Slides de Campanha (23-27)
  cpc: CampanhaSlideData;
  ctr: CampanhaSlideData;
  parcelaImpressao: CampanhaSlideData;
  impressao1aPosicao: CampanhaSlideData;
  impressaoParteSuperior: CampanhaSlideData;

  // Saving - Slide 28
  saving: {
    keywordIs: string;        // "Palavra-Chave É"
    keywordContains: string;  // "Palavra-Chave Contém"
    inicioAtuacao: string;
    savingValue: string;
    roiValue: string;
    tableImageIs: string | null;
    tableImageContains: string | null;
    analysis: string;
  };

  // Próximos Passos - Slide 29
  proximosPassos: ProximoPasso[];
}

// ─── Cores ────────────────────────────────────────────────────────────────────

const COLORS = {
  primary: "0D3349",
  primaryDark: "082640",
  cyan: "4DC0C9",
  cyanLight: "9FD9DD",
  cyanDark: "2FA5B0",
  white: "FFFFFF",
  textDark: "1A1A1A",
  textMuted: "6B7280",
  border: "E5E7EB",
  bgLight: "F8FAFB",
  success: "10B981",
  danger: "EF4444",
  warning: "F59E0B",
  blueAccent: "1A6CB0",        // Detalhes em azul nos gráficos (sidenotes)
};

const FONT_HEADING = "Calibri";
const FONT_BODY = "Calibri";

// ─── Constantes da apresentação ───────────────────────────────────────────────

export const PROXIMOS_PASSOS_DEFAULT: ProximoPasso[] = [
  { text: "Concessão do acesso de leitura à conta do Google Ads;", enabled: false },
  { text: "Start em Consultoria de Marketing de Blindagem;", enabled: false },
  { text: "Enviaremos o NPS no final da reunião, sua avaliação é importante para que possamos melhorar nossos serviços;", enabled: true },
  { text: "Verificar possíveis atualizações de whitelist/safelist;", enabled: false },
  { text: "Definirmos os principais concorrentes para monitoramento (somente brandbidding);", enabled: false },
];

export const HEATMAP_ICON_LABEL: Record<HeatmapIcon, string> = {
  sucesso: "✅ Sucesso",
  whitelist: "🚫 Whitelist",
  tratativa: "🔔 Em tratativa",
  parceiro: "🤝 Parceiro",
  nenhum: "—",
};

const HEATMAP_ICON_EMOJI: Record<HeatmapIcon, string> = {
  sucesso: "✅",
  whitelist: "🚫",
  tratativa: "🔔",
  parceiro: "🤝",
  nenhum: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function loadAsset(path: string): Promise<string | null> {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function addSlideChrome(slide: pptxgen.Slide, logo: string | null, bg: string | null) {
  if (bg) {
    slide.addImage({ data: bg, x: 0, y: 0, w: 13.333, h: 7.5, sizing: { type: "cover", w: 13.333, h: 7.5 } });
  }
  if (logo) {
    slide.addImage({ data: logo, x: 0.4, y: 0.3, w: 0.45, h: 0.45 });
  }
  slide.addText("branddi", {
    x: 0.9, y: 0.32, w: 1.2, h: 0.4,
    fontFace: FONT_HEADING, fontSize: 14, bold: true, color: COLORS.primary,
  });
}

function addContentTitle(slide: pptxgen.Slide, title: string, periodo?: string) {
  slide.addText(title, {
    x: 0.4, y: 0.85, w: 8, h: 0.5,
    fontFace: FONT_HEADING, fontSize: 22, bold: true, color: COLORS.primary,
  });
  if (periodo) {
    slide.addText(`Período: ${periodo}`, {
      x: 9.0, y: 0.92, w: 4, h: 0.4,
      fontFace: FONT_BODY, fontSize: 11, color: COLORS.textMuted, align: "right",
    });
  }
}

/**
 * Adiciona um "frame" de gráfico com borda ciano arredondada + imagem centralizada dentro.
 * Padroniza a apresentação visual de todos os gráficos no PPT.
 */
function addChartFrame(
  slide: pptxgen.Slide,
  imageData: string | null,
  frameX: number,
  frameY: number,
  frameW: number,
  frameH: number,
  innerPadding = 0.15
) {
  // Borda arredondada ciano (igual ao modelo do template)
  slide.addShape("roundRect", {
    x: frameX, y: frameY, w: frameW, h: frameH,
    fill: { color: COLORS.white },
    line: { color: COLORS.cyanLight, width: 1.5 },
    rectRadius: 0.12,
  });

  if (imageData) {
    // Imagem dentro do frame com padding, centralizada (sizing contain)
    slide.addImage({
      data: imageData,
      x: frameX + innerPadding,
      y: frameY + innerPadding,
      w: frameW - innerPadding * 2,
      h: frameH - innerPadding * 2,
      sizing: { type: "contain", w: frameW - innerPadding * 2, h: frameH - innerPadding * 2 },
    });
  }
}

function addSideNote(
  slide: pptxgen.Slide,
  text: string,
  x: number,
  y: number,
  w = 3.0,
  h = 0.8
) {
  if (!text) return;
  // pino azul + texto azul
  slide.addText(`📌 ${text}`, {
    x, y, w, h,
    fontFace: FONT_BODY, fontSize: 10, color: COLORS.blueAccent, italic: true,
  });
}

// ─── SLIDE 1 - Capa ───────────────────────────────────────────────────────────

function addCoverSlide(pptx: pptxgen, data: PresentationData, coverBg: string | null, logo: string | null) {
  const slide = pptx.addSlide();

  if (coverBg) {
    slide.addImage({ data: coverBg, x: 0, y: 0, w: 13.333, h: 7.5, sizing: { type: "cover", w: 13.333, h: 7.5 } });
  } else {
    slide.background = { color: COLORS.primary };
  }

  // Lado direito branco
  slide.addShape("rect", {
    x: 7.5, y: 0, w: 5.833, h: 7.5,
    fill: { color: COLORS.white }, line: { type: "none" },
  });

  if (logo) slide.addImage({ data: logo, x: 0.5, y: 0.4, w: 0.5, h: 0.5 });
  slide.addText("branddi", {
    x: 1.05, y: 0.42, w: 1.5, h: 0.4,
    fontFace: FONT_HEADING, fontSize: 16, bold: true, color: COLORS.white,
  });

  slide.addText("Status Mensal", {
    x: 0.6, y: 3.0, w: 7, h: 0.8,
    fontFace: FONT_HEADING, fontSize: 40, bold: true, color: COLORS.white,
  });
  slide.addText(data.monthYear, {
    x: 0.6, y: 3.9, w: 7, h: 0.5,
    fontFace: FONT_BODY, fontSize: 18, color: COLORS.cyanLight,
  });

  slide.addText(data.clientName.toUpperCase(), {
    x: 7.7, y: 3.0, w: 5.4, h: 1.5,
    fontFace: FONT_HEADING, fontSize: 36, bold: true, color: COLORS.primary,
    align: "center", valign: "middle",
  });
}

// ─── SLIDE 2 - Divisor "Brand Bidding" ───────────────────────────────────────

function addDividerSlide(pptx: pptxgen, title: string, coverBg: string | null, logo: string | null) {
  const slide = pptx.addSlide();
  if (coverBg) {
    slide.addImage({ data: coverBg, x: 0, y: 0, w: 13.333, h: 7.5, sizing: { type: "cover", w: 13.333, h: 7.5 } });
  } else {
    slide.background = { color: COLORS.primary };
  }
  if (logo) slide.addImage({ data: logo, x: 0.5, y: 0.4, w: 0.5, h: 0.5 });
  slide.addText("branddi", {
    x: 1.05, y: 0.42, w: 1.5, h: 0.4,
    fontFace: FONT_HEADING, fontSize: 16, bold: true, color: COLORS.white,
  });

  // Quebra título em duas linhas
  const parts = title.split(" ");
  if (parts.length === 2) {
    slide.addText(parts[0], {
      x: 1.5, y: 2.7, w: 7, h: 1.2,
      fontFace: FONT_HEADING, fontSize: 60, bold: true, color: COLORS.white,
    });
    slide.addText(parts[1], {
      x: 1.5, y: 3.9, w: 7, h: 1.2,
      fontFace: FONT_HEADING, fontSize: 60, bold: true, color: COLORS.white,
    });
  } else {
    slide.addText(title, {
      x: 1.5, y: 3.0, w: 10, h: 1.5,
      fontFace: FONT_HEADING, fontSize: 56, bold: true, color: COLORS.white,
    });
  }
}

// ─── SLIDE 3 - Big Numbers (Toda parceria) ───────────────────────────────────

function addBigNumbersTotalSlide(
  pptx: pptxgen, data: PresentationData, logo: string | null, bg: string | null
) {
  const slide = pptx.addSlide();
  addSlideChrome(slide, logo, bg);
  addContentTitle(slide, "Big Numbers", "Toda a parceria");

  slide.addText("Total:", {
    x: 0.4, y: 1.5, w: 5, h: 0.4,
    fontFace: FONT_HEADING, fontSize: 14, bold: true, color: COLORS.textDark,
  });

  const notif = parseInt(data.bigNumbersTotal.notificados) || 0;
  const resolv = parseInt(data.bigNumbersTotal.resolvidos) || 0;
  const taxa = notif > 0 ? Math.round((resolv / notif) * 100) : 0;

  const numeros = [
    { label: "Agressores Identificados", value: data.bigNumbersTotal.identificados, x: 0.4, y: 2.0 },
    { label: "Inativos", value: data.bigNumbersTotal.inativos, x: 2.6, y: 2.0 },
    { label: "Ocorrências", value: data.bigNumbersTotal.ocorrencias, x: 4.8, y: 2.0 },
    { label: "Notificados", value: data.bigNumbersTotal.notificados, x: 0.4, y: 4.2 },
    { label: "Resolvidos", value: data.bigNumbersTotal.resolvidos, x: 2.6, y: 4.2 },
    { label: "Notificações enviadas*", value: data.bigNumbersTotal.notificacoesEnviadas, x: 4.8, y: 4.2 },
  ];

  numeros.forEach((n) => {
    slide.addText(n.value || "—", {
      x: n.x, y: n.y, w: 2, h: 0.9,
      fontFace: FONT_HEADING, fontSize: 38, bold: true, color: COLORS.cyan, align: "center",
    });
    slide.addText(n.label, {
      x: n.x, y: n.y + 0.95, w: 2, h: 0.4,
      fontFace: FONT_BODY, fontSize: 11, color: COLORS.textMuted, align: "center",
    });
  });

  // Taxa de sucesso (lado direito)
  slide.addText(`${taxa}%`, {
    x: 7.5, y: 2.0, w: 5.5, h: 2.5,
    fontFace: FONT_HEADING, fontSize: 110, bold: true, color: COLORS.cyan, align: "center",
  });
  slide.addText("de sucesso em Takedowns", {
    x: 7.5, y: 4.6, w: 5.5, h: 0.5,
    fontFace: FONT_BODY, fontSize: 14, color: COLORS.textDark, align: "center",
  });

  // Economia
  if (data.economiaTotal) {
    slide.addText(`*Economia total de R${parseFloat(data.economiaTotal.replace(/\./g,"").replace(",",".")).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})} em notificações enviadas.`, {
      x: 0.4, y: 5.6, w: 7, h: 0.4,
      fontFace: FONT_BODY, fontSize: 10, color: COLORS.textMuted, italic: true,
    });
  }

  if (data.bigNumbersTotalAnalysis) {
    slide.addText(data.bigNumbersTotalAnalysis, {
      x: 0.4, y: 6.3, w: 12.5, h: 0.9,
      fontFace: FONT_BODY, fontSize: 11, color: COLORS.textMuted, italic: true,
    });
  }
}

// ─── SLIDE 4 - Big Numbers Duplo (Parceria + Mês) ────────────────────────────

function addBigNumbersDuploSlide(
  pptx: pptxgen, data: PresentationData, logo: string | null, bg: string | null
) {
  const slide = pptx.addSlide();
  addSlideChrome(slide, logo, bg);
  slide.addText("Big Numbers", {
    x: 0.4, y: 0.85, w: 8, h: 0.5,
    fontFace: FONT_HEADING, fontSize: 22, bold: true, color: COLORS.primary,
  });

  // Coluna ESQUERDA - Todo Período
  slide.addText("Todo o Período:", {
    x: 0.4, y: 1.5, w: 6, h: 0.4,
    fontFace: FONT_HEADING, fontSize: 13, bold: true, color: COLORS.textDark,
  });

  const totalNumeros = [
    { label: "Agressores Identificados", value: data.bigNumbersTotal.identificados },
    { label: "Inativos", value: data.bigNumbersTotal.inativos },
    { label: "Ocorrências", value: data.bigNumbersTotal.ocorrencias },
    { label: "Notificados", value: data.bigNumbersTotal.notificados },
    { label: "Resolvidos", value: data.bigNumbersTotal.resolvidos },
  ];

  totalNumeros.forEach((n, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.4 + col * 1.9;
    const y = 2.0 + row * 1.4;
    slide.addText(n.value || "—", {
      x, y, w: 1.7, h: 0.6,
      fontFace: FONT_HEADING, fontSize: 26, bold: true, color: COLORS.cyan, align: "center",
    });
    slide.addText(n.label, {
      x, y: y + 0.65, w: 1.7, h: 0.4,
      fontFace: FONT_BODY, fontSize: 9, color: COLORS.textMuted, align: "center",
    });
  });

  // Linha divisória
  slide.addShape("line", {
    x: 6.5, y: 1.5, w: 0, h: 5,
    line: { color: COLORS.border, width: 1 },
  });

  // Coluna DIREITA - Período mensal
  slide.addText(`${data.periodoMes || "Mês atual"}:`, {
    x: 6.8, y: 1.5, w: 6, h: 0.4,
    fontFace: FONT_HEADING, fontSize: 13, bold: true, color: COLORS.textDark,
  });

  const mesNumeros = [
    { label: "Agressores Identificados", value: data.bigNumbersMes.identificados },
    { label: "Inativos", value: data.bigNumbersMes.inativos },
    { label: "Ocorrências", value: data.bigNumbersMes.ocorrencias },
    { label: "Notificados", value: data.bigNumbersMes.notificados },
    { label: "Resolvidos", value: data.bigNumbersMes.resolvidos },
    { label: "Notificações enviadas*", value: data.bigNumbersMes.notificacoesEnviadas },
  ];

  mesNumeros.forEach((n, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 6.8 + col * 1.9;
    const y = 2.0 + row * 1.4;
    slide.addText(n.value || "—", {
      x, y, w: 1.7, h: 0.6,
      fontFace: FONT_HEADING, fontSize: 26, bold: true, color: COLORS.cyan, align: "center",
    });
    slide.addText(n.label, {
      x, y: y + 0.65, w: 1.7, h: 0.4,
      fontFace: FONT_BODY, fontSize: 9, color: COLORS.textMuted, align: "center",
    });
  });

  // Taxa de Sucesso do mês
  const tx = data.taxaSucessoMes || (() => {
    const n = parseInt(data.bigNumbersMes.notificados) || 0;
    const r = parseInt(data.bigNumbersMes.resolvidos) || 0;
    return n > 0 ? `${Math.round((r/n)*100)}%` : "—";
  })();

  slide.addText(tx, {
    x: 10.6, y: 4.8, w: 2, h: 0.7,
    fontFace: FONT_HEADING, fontSize: 32, bold: true, color: COLORS.cyan, align: "center",
  });
  slide.addText("Taxa de Sucesso", {
    x: 10.6, y: 5.5, w: 2, h: 0.4,
    fontFace: FONT_BODY, fontSize: 9, color: COLORS.textMuted, align: "center",
  });

  if (data.economiaMes) {
    slide.addText(`*Economia total de R${parseFloat(data.economiaMes.replace(/\./g,"").replace(",",".")).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})} em notificações enviadas.`, {
      x: 6.8, y: 6.5, w: 6.5, h: 0.4,
      fontFace: FONT_BODY, fontSize: 9, color: COLORS.textMuted, italic: true,
    });
  }
}

// ─── SLIDE 5 - Branddi Score ─────────────────────────────────────────────────

function addBranddiScoreSlide(pptx: pptxgen, data: PresentationData, logo: string | null, bg: string | null) {
  const slide = pptx.addSlide();
  addSlideChrome(slide, logo, bg);
  addContentTitle(slide, "Branddi Score");

  slide.addText(
    "O Branddi Score mede a blindagem de sua marca a partir da agressividade total dos agressores capturados.",
    { x: 0.4, y: 1.4, w: 12.5, h: 0.5, fontFace: FONT_BODY, fontSize: 12, color: COLORS.textDark }
  );

  // Gráfico centralizado, largura total
  addChartFrame(slide, data.branddiScoreImage, 0.4, 1.9, 12.53, 4.6);

  // Detalhe em azul (sidenote) - sobreposto canto superior direito do gráfico
  if (data.branddiScoreSideNote) {
    addSideNote(slide, data.branddiScoreSideNote, 9.4, 2.1, 3.2, 1.5);
  }

  if (data.branddiScoreAnalysis) {
    slide.addText(data.branddiScoreAnalysis, {
      x: 0.4, y: 6.65, w: 12.5, h: 0.7,
      fontFace: FONT_BODY, fontSize: 11, color: COLORS.textMuted, italic: true,
    });
  }
}

// ─── SLIDES 6 e 7 - Agressores ───────────────────────────────────────────────

function addAgressoresSlide(
  pptx: pptxgen, data: PresentationData,
  variant: "total" | "semanal", logo: string | null, bg: string | null
) {
  const slide = pptx.addSlide();
  addSlideChrome(slide, logo, bg);
  const periodo = variant === "total" ? "Toda a parceria" : "Últimos 2 meses";
  addContentTitle(slide, "Agressores", periodo);

  const analysis = variant === "total" ? data.agressoresTotalAnalysis : data.agressoresSemanalAnalysis;
  const sideNote = variant === "total" ? data.agressoresTotalSideNote : data.agressoresSemanalSideNote;
  const image = variant === "total" ? data.agressoresTotalImage : data.agressoresSemanalImage;

  // Análise ACIMA do gráfico
  if (analysis) {
    slide.addText(analysis, {
      x: 0.4, y: 1.35, w: 12.5, h: 0.55,
      fontFace: FONT_BODY, fontSize: 12, color: COLORS.textDark,
    });
  }

  // Gráfico: esticado na largura total do slide, centralizado verticalmente
  // Slide = 13.333 × 7.5 in. Análise termina ~1.9, margem baixo ~0.3 → altura disponível ~5.3
  const chartX = 0.35;
  const chartY = analysis ? 2.0 : 1.5;
  const chartW = 12.63; // quase borda a borda (13.333 - 0.35*2)
  const chartH = 5.1;   // alto o suficiente para os números ficarem visíveis

  addChartFrame(slide, image, chartX, chartY, chartW, chartH);

  // Nota lateral (se houver) — posicionada à direita DENTRO do frame
  if (sideNote) {
    addSideNote(slide, sideNote, chartX + chartW - 3.4, chartY + 0.3, 3.2, 1.5);
  }
}

// ─── SLIDES 8 e 9 - Análise de Termos ────────────────────────────────────────

function addAnaliseTermosSlide(
  pptx: pptxgen, data: PresentationData,
  variant: 1, logo: string | null, bg: string | null
) {
  const slide = pptx.addSlide();
  addSlideChrome(slide, logo, bg);
  addContentTitle(slide, "Análise de Termos", "Últimos 3 meses");

  const compostoImg = data.termosCompostoImage;
  const puroImg = data.termoPuroImage;
  const analysisTxt = data.termosAnalysis;

  // Esquerda: Todos os termos
  slide.addText("Todos os termos", {
    x: 0.4, y: 1.4, w: 6, h: 0.4,
    fontFace: FONT_HEADING, fontSize: 13, bold: true, color: COLORS.primary, align: "center",
  });
  addChartFrame(slide, compostoImg, 0.4, 1.9, 6, 4);

  // Direita: Termo puro - Página 1
  slide.addText("Termo puro - Página 1", {
    x: 6.9, y: 1.4, w: 6, h: 0.4,
    fontFace: FONT_HEADING, fontSize: 13, bold: true, color: COLORS.primary, align: "center",
  });
  addChartFrame(slide, puroImg, 6.9, 1.9, 6, 4);

  // Análise COMPARATIVA (única, embaixo - largura total)
  if (analysisTxt) {
    slide.addText(analysisTxt, {
      x: 0.4, y: 6.1, w: 12.5, h: 1.2,
      fontFace: FONT_BODY, fontSize: 10, color: COLORS.textDark, italic: true, align: "center",
    });
  }
}

// ─── SLIDE 10 - Vazio decorativo ─────────────────────────────────────────────

function addEmptySlide(pptx: pptxgen, logo: string | null, bg: string | null) {
  const slide = pptx.addSlide();
  addSlideChrome(slide, logo, bg);
}

// ─── SLIDES 11 e 12 - Share de Ocorrências ──────────────────────────────────

function addShareSlide(
  pptx: pptxgen, data: PresentationData,
  variant: "keyword" | "agressor", logo: string | null, bg: string | null
) {
  const slide = pptx.addSlide();
  addSlideChrome(slide, logo, bg);
  addContentTitle(slide, "Análise de Share de Ocorrências", "Últimos 30 dias");

  const image = variant === "keyword" ? data.shareKeywordImage : data.shareAgressorImage;
  const analysis = variant === "keyword" ? data.shareKeywordAnalysis : data.shareAgressorAnalysis;
  const analysis2 = variant === "agressor" ? data.shareAgressorAnalysis2 : "";

  // Gráfico centralizado e dominante (largura cheia)
  addChartFrame(slide, image, 1.5, 1.5, 10.3, 4.3);

  // Análises EMBAIXO do gráfico (igual ao modelo) - 2 linhas em azul
  if (analysis) {
    slide.addText(`📌 ${analysis}`, {
      x: 0.6, y: 6.0, w: 12.1, h: 0.5,
      fontFace: FONT_BODY, fontSize: 11, color: COLORS.blueAccent, italic: true,
    });
  }
  if (analysis2) {
    slide.addText(`📌 ${analysis2}`, {
      x: 0.6, y: 6.6, w: 12.1, h: 0.5,
      fontFace: FONT_BODY, fontSize: 11, color: COLORS.blueAccent, italic: true,
    });
  }
}

// ─── SLIDE 12a - Afiliados ────────────────────────────────────────────────────

function addAfiliadosSlide(pptx: pptxgen, data: PresentationData, logo: string | null, bg: string | null) {
  const slide = pptx.addSlide();
  addSlideChrome(slide, logo, bg);
  addContentTitle(slide, "Afiliados");

  // Print completo do dashboard de afiliados (já contém barras, pizza e big numbers)
  addChartFrame(slide, data.afiliadosBarImage, 0.4, 1.5, 12.5, 5.7);
}

// ─── SLIDE 12b - Análise de Bing ──────────────────────────────────────────────

function addAnaliseBingSlide(pptx: pptxgen, data: PresentationData, logo: string | null, bg: string | null) {
  const slide = pptx.addSlide();
  addSlideChrome(slide, logo, bg);

  // Título com logo Bing no canto
  slide.addText("Análise de Bing", {
    x: 0.4, y: 0.85, w: 8, h: 0.5,
    fontFace: FONT_HEADING, fontSize: 22, bold: true, color: COLORS.primary,
  });
  slide.addText("Bing", {
    x: 10.5, y: 0.6, w: 2.5, h: 0.5,
    fontFace: FONT_HEADING, fontSize: 22, bold: true, color: "0078D4",
  });
  slide.addText("Período: Últimos 30 dias", {
    x: 9.0, y: 1.1, w: 4, h: 0.35,
    fontFace: FONT_BODY, fontSize: 11, color: COLORS.textMuted, align: "right",
    bold: true,
  });

  // Pizza esquerda (plataformas)
  addChartFrame(slide, data.bingPizzaPlataformaImage, 0.4, 1.55, 6.1, 4.3);

  // Pizza direita (termos)
  addChartFrame(slide, data.bingPizzaTermosImage, 6.9, 1.55, 6.0, 4.3);

  // Análises embaixo lado a lado
  if (data.bingAnalysisPlataforma) {
    slide.addShape("roundRect", {
      x: 0.4, y: 5.95, w: 6.1, h: 1.3,
      fill: { color: "EEF9FA" }, line: { color: COLORS.cyanLight, width: 0.75 },
      rectRadius: 0.08,
    });
    slide.addText(data.bingAnalysisPlataforma, {
      x: 0.55, y: 6.05, w: 5.8, h: 1.1,
      fontFace: FONT_BODY, fontSize: 10, color: COLORS.textDark,
    });
  }

  if (data.bingAnalysisTermos) {
    slide.addShape("roundRect", {
      x: 6.9, y: 5.95, w: 6.0, h: 1.3,
      fill: { color: "EEF9FA" }, line: { color: COLORS.cyanLight, width: 0.75 },
      rectRadius: 0.08,
    });
    slide.addText(data.bingAnalysisTermos, {
      x: 7.05, y: 6.05, w: 5.7, h: 1.1,
      fontFace: FONT_BODY, fontSize: 10, color: COLORS.textDark, bold: true,
    });
  }
}

// ─── SLIDE 12c - Análise de Share de Ocorrências (Bing) ──────────────────────

function addBingShareSlide(pptx: pptxgen, data: PresentationData, logo: string | null, bg: string | null) {
  const slide = pptx.addSlide();
  addSlideChrome(slide, logo, bg);

  slide.addText("Análise de Share de Ocorrências", {
    x: 0.4, y: 0.85, w: 8.5, h: 0.5,
    fontFace: FONT_HEADING, fontSize: 22, bold: true, color: COLORS.primary,
  });
  // Bing label inline
  slide.addText("Bing", {
    x: 8.6, y: 0.85, w: 1.5, h: 0.5,
    fontFace: FONT_HEADING, fontSize: 18, bold: true, color: "0078D4",
  });
  slide.addText("Período: Últimos 30 dias", {
    x: 9.0, y: 1.2, w: 4, h: 0.35,
    fontFace: FONT_BODY, fontSize: 11, color: COLORS.textMuted, align: "right",
    bold: true,
  });

  // Horizontal bar chart (largura total com frame)
  addChartFrame(slide, data.bingShareBarImage, 0.4, 1.6, 12.5, 5.2);

  if (data.bingShareAnalysis) {
    slide.addShape("roundRect", {
      x: 0.4, y: 6.9, w: 12.5, h: 0.45,
      fill: { color: "EEF9FA" }, line: { color: COLORS.cyanLight, width: 0.5 },
      rectRadius: 0.06,
    });
    slide.addText(data.bingShareAnalysis, {
      x: 0.55, y: 6.95, w: 12.2, h: 0.35,
      fontFace: FONT_BODY, fontSize: 10, color: COLORS.textDark,
    });
  }
}

// ─── SLIDE 12d - Share de Ocorrências - Somente Concorrentes ─────────────────

function addShareConcorrentesSlide(pptx: pptxgen, data: PresentationData, logo: string | null, bg: string | null) {
  const slide = pptx.addSlide();
  addSlideChrome(slide, logo, bg);
  addContentTitle(slide, "Análise de Share de Ocorrências - Somente concorrentes", "Últimos 30 dias");

  // Horizontal bar chart (esquerda)
  addChartFrame(slide, data.concorrentesBarImage, 0.4, 1.55, 7.8, 5.2);

  // Pizza chart (direita)
  addChartFrame(slide, data.concorrentesPizzaImage, 8.4, 1.55, 4.5, 5.2);

  // Análise esquerda
  if (data.concorrentesAnalysis) {
    slide.addShape("roundRect", {
      x: 0.4, y: 6.85, w: 7.8, h: 0.45,
      fill: { color: "EEF9FA" }, line: { color: COLORS.cyanLight, width: 0.5 },
      rectRadius: 0.06,
    });
    slide.addText(data.concorrentesAnalysis, {
      x: 0.55, y: 6.9, w: 7.5, h: 0.35,
      fontFace: FONT_BODY, fontSize: 9, color: COLORS.textDark,
    });
  }

  // Análise direita
  if (data.concorrentesAnalysisPizza) {
    slide.addShape("roundRect", {
      x: 8.4, y: 6.85, w: 4.5, h: 0.45,
      fill: { color: "EEF9FA" }, line: { color: COLORS.cyanLight, width: 0.5 },
      rectRadius: 0.06,
    });
    slide.addText(data.concorrentesAnalysisPizza, {
      x: 8.55, y: 6.9, w: 4.2, h: 0.35,
      fontFace: FONT_BODY, fontSize: 9, color: COLORS.textDark, bold: true,
    });
  }
}

// ─── SLIDE 12e - Share de Ocorrências - Somente Whitelist ────────────────────

function addShareWhitelistSlide(pptx: pptxgen, data: PresentationData, logo: string | null, bg: string | null) {
  const slide = pptx.addSlide();
  addSlideChrome(slide, logo, bg);
  addContentTitle(slide, "Análise de Share de Ocorrências - Somente Whitelist", "Últimos 30 dias");

  // Horizontal bar chart (esquerda)
  addChartFrame(slide, data.whitelistBarImage, 0.4, 1.55, 7.8, 5.2);

  // Pizza chart (direita)
  addChartFrame(slide, data.whitelistPizzaImage, 8.4, 1.55, 4.5, 5.2);

  // Análise esquerda
  if (data.whitelistAnalysis) {
    slide.addShape("roundRect", {
      x: 0.4, y: 6.85, w: 7.8, h: 0.45,
      fill: { color: "EEF9FA" }, line: { color: COLORS.cyanLight, width: 0.5 },
      rectRadius: 0.06,
    });
    slide.addText(data.whitelistAnalysis, {
      x: 0.55, y: 6.9, w: 7.5, h: 0.35,
      fontFace: FONT_BODY, fontSize: 9, color: COLORS.textDark,
    });
  }

  // Análise direita
  if (data.whitelistAnalysisPizza) {
    slide.addShape("roundRect", {
      x: 8.4, y: 6.85, w: 4.5, h: 0.45,
      fill: { color: "EEF9FA" }, line: { color: COLORS.cyanLight, width: 0.5 },
      rectRadius: 0.06,
    });
    slide.addText(data.whitelistAnalysisPizza, {
      x: 8.55, y: 6.9, w: 4.2, h: 0.35,
      fontFace: FONT_BODY, fontSize: 9, color: COLORS.textDark, bold: true,
    });
  }
}

// ─── SLIDE 13 - Trademark Evidências ─────────────────────────────────────────

function addTrademarkEvidenciaSlide(pptx: pptxgen, data: PresentationData, logo: string | null, bg: string | null) {
  const slide = pptx.addSlide();
  addSlideChrome(slide, logo, bg);
  addContentTitle(slide, "Uso Indevido de Trademark em Anúncios", "Últimos 30 dias");

  // Boxes de números
  slide.addShape("rect", {
    x: 0.4, y: 1.5, w: 1.6, h: 1.2,
    fill: { color: COLORS.bgLight }, line: { color: COLORS.border, width: 0.5 },
  });
  slide.addText(data.trademarkAgressores || "—", {
    x: 0.4, y: 1.55, w: 1.6, h: 0.7,
    fontFace: FONT_HEADING, fontSize: 28, bold: true, color: COLORS.cyan, align: "center",
  });
  slide.addText("Agressores", {
    x: 0.4, y: 2.25, w: 1.6, h: 0.4,
    fontFace: FONT_BODY, fontSize: 10, color: COLORS.textMuted, align: "center",
  });

  slide.addShape("rect", {
    x: 2.1, y: 1.5, w: 1.6, h: 1.2,
    fill: { color: COLORS.bgLight }, line: { color: COLORS.border, width: 0.5 },
  });
  slide.addText(data.trademarkOcorrencias || "—", {
    x: 2.1, y: 1.55, w: 1.6, h: 0.7,
    fontFace: FONT_HEADING, fontSize: 28, bold: true, color: COLORS.cyan, align: "center",
  });
  slide.addText("Ocorrências", {
    x: 2.1, y: 2.25, w: 1.6, h: 0.4,
    fontFace: FONT_BODY, fontSize: 10, color: COLORS.textMuted, align: "center",
  });

  // Subtítulo
  slide.addText("Share de Ocorrências em Trademark", {
    x: 0.4, y: 3.0, w: 7, h: 0.4,
    fontFace: FONT_HEADING, fontSize: 12, bold: true, color: COLORS.primary,
  });

  // Gráfico share trademark com frame ciano
  addChartFrame(slide, data.trademarkShareImage, 0.4, 3.5, 7, 3.3);

  // Análise (sidenote em azul)
  if (data.trademarkAnalysis) {
    addSideNote(slide, data.trademarkAnalysis, 0.4, 6.7, 7, 0.5);
  }

  // Evidências (direita)
  slide.addText("Evidências:", {
    x: 8.2, y: 1.5, w: 4.5, h: 0.4,
    fontFace: FONT_HEADING, fontSize: 12, bold: true, color: COLORS.primary,
  });

  data.trademarkEvidences.slice(0, 2).forEach((ev, i) => {
    const y = 2.0 + i * 2.6;
    if (ev.imageDataUrl) {
      slide.addImage({
        data: ev.imageDataUrl,
        x: 8.2, y, w: 4.5, h: 1.8,
        sizing: { type: "contain", w: 4.5, h: 1.8 },
      });
    }
    if (ev.caption) {
      slide.addText(ev.caption, {
        x: 8.2, y: y + 1.85, w: 4.5, h: 0.4,
        fontFace: FONT_BODY, fontSize: 9, color: COLORS.textMuted, italic: true, align: "center",
      });
    }
  });
}

// ─── SLIDE 14 - Trademark Aprovação ──────────────────────────────────────────

function addTrademarkAprovSlide(pptx: pptxgen, data: PresentationData, logo: string | null, bg: string | null) {
  const slide = pptx.addSlide();
  addSlideChrome(slide, logo, bg);
  addContentTitle(slide, "Uso Indevido de Trademark em Anúncios");
  slide.addText("Aguardando aprovação", {
    x: 9.0, y: 0.92, w: 4, h: 0.4,
    fontFace: FONT_BODY, fontSize: 11, color: COLORS.textMuted, align: "right",
  });

  slide.addText("Agressores aguardando aprovação para entrarem no fluxo de denúncia.", {
    x: 0.4, y: 1.5, w: 12.5, h: 0.4,
    fontFace: FONT_BODY, fontSize: 12, color: COLORS.textDark,
  });

  // Boxes
  slide.addShape("rect", {
    x: 0.4, y: 2.2, w: 1.8, h: 1.4,
    fill: { color: COLORS.bgLight }, line: { color: COLORS.border, width: 0.5 },
  });
  slide.addText(data.trademarkAprovAgressores || "—", {
    x: 0.4, y: 2.25, w: 1.8, h: 0.8,
    fontFace: FONT_HEADING, fontSize: 30, bold: true, color: COLORS.cyan, align: "center",
  });
  slide.addText("Agressores", {
    x: 0.4, y: 3.05, w: 1.8, h: 0.4,
    fontFace: FONT_BODY, fontSize: 10, color: COLORS.textMuted, align: "center",
  });

  slide.addShape("rect", {
    x: 2.3, y: 2.2, w: 1.8, h: 1.4,
    fill: { color: COLORS.bgLight }, line: { color: COLORS.border, width: 0.5 },
  });
  slide.addText(data.trademarkAprovOcorrencias || "—", {
    x: 2.3, y: 2.25, w: 1.8, h: 0.8,
    fontFace: FONT_HEADING, fontSize: 30, bold: true, color: COLORS.cyan, align: "center",
  });
  slide.addText("Ocorrências", {
    x: 2.3, y: 3.05, w: 1.8, h: 0.4,
    fontFace: FONT_BODY, fontSize: 10, color: COLORS.textMuted, align: "center",
  });

  // Frame ciano centralizado
  addChartFrame(slide, data.trademarkAprovImage, 5, 2.0, 8, 4.5);

  if (data.trademarkAprovAnalysis) {
    slide.addText(data.trademarkAprovAnalysis, {
      x: 0.4, y: 6.5, w: 12.5, h: 0.7,
      fontFace: FONT_BODY, fontSize: 11, color: COLORS.textMuted, italic: true,
    });
  }
}

// ─── SLIDE 15 - Heatmap (com emojis) ─────────────────────────────────────────

function addHeatmapSlide(pptx: pptxgen, data: PresentationData, logo: string | null, bg: string | null) {
  const slide = pptx.addSlide();
  addSlideChrome(slide, logo, bg);
  addContentTitle(slide, "Heatmap", "Últimos 3 meses");

  // ═══ LEGENDA DINÂMICA NO TOPO ═══
  // Detecta quais ícones realmente foram usados nas linhas classificadas
  const linhas = data.heatmapRows.slice(0, 14);
  const iconesUsados = new Set<HeatmapIcon>();
  linhas.forEach((row) => {
    if (row.icon !== "nenhum" && row.domain.trim()) {
      iconesUsados.add(row.icon);
    }
  });

  // Labels da legenda
  const LEGEND_LABEL: Record<HeatmapIcon, string> = {
    sucesso: "Sucesso",
    whitelist: "Whitelist",
    tratativa: "Em tratativa",
    parceiro: "Parceiro",
    nenhum: "",
  };

  // Renderiza badges da legenda (só dos ícones usados)
  if (iconesUsados.size > 0) {
    const ordem: HeatmapIcon[] = ["sucesso", "whitelist", "tratativa", "parceiro"];
    const usadosOrdenados = ordem.filter((ic) => iconesUsados.has(ic));

    let xCursor = 0.5;
    usadosOrdenados.forEach((ic) => {
      const emoji = HEATMAP_ICON_EMOJI[ic];
      const label = LEGEND_LABEL[ic];
      const txt = `${emoji}  ${label}`;
      // Estimativa de largura: ~0.18in por char + padding
      const w = Math.max(1.4, txt.length * 0.13 + 0.4);

      // Pílula de fundo claro
      slide.addShape("roundRect", {
        x: xCursor, y: 1.45, w, h: 0.4,
        fill: { color: COLORS.bgLight },
        line: { color: COLORS.cyanLight, width: 0.75 },
        rectRadius: 0.2,
      });
      slide.addText(txt, {
        x: xCursor, y: 1.45, w, h: 0.4,
        fontFace: FONT_BODY, fontSize: 11, color: COLORS.primary,
        bold: true, align: "center", valign: "middle",
      });
      xCursor += w + 0.15;
    });
  }

  // ═══ GRÁFICO DOMINANTE COM FRAME CIANO (centro/grande) ═══
  addChartFrame(slide, data.heatmapImage, 0.4, 2.0, 12.5, 4.2);

  // ═══ LISTA COMPACTA DE CLASSIFICAÇÃO ABAIXO (2 colunas) ═══
  const classificadas = linhas.filter((r) => r.icon !== "nenhum" && r.domain.trim());
  if (classificadas.length > 0) {
    const linhasPorColuna = Math.ceil(classificadas.length / 2);
    classificadas.forEach((row, i) => {
      const col = Math.floor(i / linhasPorColuna);
      const linhaNaCol = i % linhasPorColuna;
      const x = col === 0 ? 0.5 : 6.7;
      const y = 6.35 + linhaNaCol * 0.28;
      const emoji = HEATMAP_ICON_EMOJI[row.icon];
      slide.addText(`${emoji}  ${row.domain}`, {
        x, y, w: 6, h: 0.25,
        fontFace: FONT_BODY, fontSize: 10, color: COLORS.textDark,
      });
    });
  }

  // Análise (se houver) abaixo de tudo
  if (data.heatmapAnalysis) {
    slide.addText(data.heatmapAnalysis, {
      x: 0.5, y: 7.05, w: 12.3, h: 0.4,
      fontFace: FONT_BODY, fontSize: 10, color: COLORS.blueAccent, italic: true,
    });
  }
}

// ─── SLIDE 16 - Evolução de agressividade ────────────────────────────────────

function addEvolucaoSlide(pptx: pptxgen, data: PresentationData, logo: string | null, bg: string | null) {
  const slide = pptx.addSlide();
  addSlideChrome(slide, logo, bg);
  addContentTitle(slide, "Evolução de agressividade", "Últimos 3 meses");

  const headerStyle = {
    bold: true, fontSize: 11, color: COLORS.white,
    fill: { color: COLORS.primary },
    fontFace: FONT_HEADING, valign: "middle" as const, align: "center" as const, margin: 0.05,
  };
  const cellStyle = {
    fontSize: 10, color: COLORS.textDark, fontFace: FONT_BODY,
    valign: "middle" as const, margin: 0.05,
  };
  const cellCenter = { ...cellStyle, align: "center" as const };

  const rows: pptxgen.TableRow[] = [
    [
      { text: "Domínio", options: headerStyle },
      { text: data.evolucaoMeses[0] || "Mês 1", options: headerStyle },
      { text: data.evolucaoMeses[1] || "Mês 2", options: headerStyle },
      { text: data.evolucaoMeses[2] || "Mês 3", options: headerStyle },
    ],
    ...data.evolucaoRows.slice(0, 8).map((r): pptxgen.TableRow => [
      { text: r.domain, options: cellStyle },
      { text: r.mes1, options: cellCenter },
      { text: r.mes2, options: cellCenter },
      { text: r.mes3, options: cellCenter },
    ]),
  ];

  slide.addTable(rows, {
    x: 0.6, y: 1.6, w: 12,
    colW: [4.8, 2.4, 2.4, 2.4],
    border: { type: "solid", pt: 0.5, color: COLORS.border },
    autoPage: false,
  });

  if (data.evolucaoAnalysis) {
    slide.addText(`📌 ${data.evolucaoAnalysis}`, {
      x: 0.6, y: 6.5, w: 12, h: 0.7,
      fontFace: FONT_BODY, fontSize: 11, color: COLORS.blueAccent, italic: true,
    });
  }
}

// ─── SLIDE 17 - Tratativas em Andamento ──────────────────────────────────────

function addTratativasSlide(pptx: pptxgen, data: PresentationData, logo: string | null, bg: string | null) {
  const slide = pptx.addSlide();
  addSlideChrome(slide, logo, bg);
  addContentTitle(slide, "Tratativas em Andamento");
  slide.addText("Agressores: Principais", {
    x: 9.0, y: 0.92, w: 4, h: 0.4,
    fontFace: FONT_BODY, fontSize: 11, color: COLORS.textMuted, align: "right",
  });

  const headerStyle = {
    bold: true, fontSize: 9, color: COLORS.white,
    fill: { color: COLORS.primary },
    fontFace: FONT_HEADING, valign: "middle" as const, align: "center" as const, margin: 0.04,
  };
  const cellStyle = {
    fontSize: 8, color: COLORS.textDark, fontFace: FONT_BODY,
    valign: "middle" as const, margin: 0.04,
  };

  const rows: pptxgen.TableRow[] = [
    [
      { text: "Agressor", options: headerStyle },
      { text: "Termos atingidos", options: headerStyle },
      { text: "Top Leilão", options: headerStyle },
      { text: "Notif.", options: headerStyle },
      { text: "Última", options: headerStyle },
      { text: "Resp.", options: headerStyle },
      { text: "Observação", options: headerStyle },
    ],
    ...data.tratativas.slice(0, 6).map((t): pptxgen.TableRow => {
      const cs = t.topLeilao === "sim" ? "✓" : t.topLeilao === "nao" ? "✗" : "—";
      const cr = t.respondeu === "sim" ? "✓" : t.respondeu === "nao" ? "✗" : "—";
      return [
        { text: `${t.agressividade ? `${t.agressividade} - ` : ""}${t.agressor}`, options: cellStyle },
        { text: t.termos, options: cellStyle },
        { text: cs, options: { ...cellStyle, align: "center" as const, color: t.topLeilao === "sim" ? COLORS.success : COLORS.textMuted } },
        { text: t.notificacoes, options: { ...cellStyle, align: "center" as const } },
        { text: t.ultimaComunicacao, options: { ...cellStyle, align: "center" as const } },
        { text: cr, options: { ...cellStyle, align: "center" as const, color: t.respondeu === "sim" ? COLORS.success : COLORS.textMuted } },
        { text: t.observacao, options: cellStyle },
      ];
    }),
  ];

  slide.addTable(rows, {
    x: 0.4, y: 1.5, w: 12.5,
    colW: [1.7, 1.7, 0.8, 0.8, 1.0, 0.7, 5.8],
    border: { type: "solid", pt: 0.5, color: COLORS.border },
    autoPage: false,
  });
}

// ─── SLIDE 18 - Termos atingidos ─────────────────────────────────────────────

function addTermosAtingidosSlide(pptx: pptxgen, data: PresentationData, logo: string | null, bg: string | null) {
  const slide = pptx.addSlide();
  addSlideChrome(slide, logo, bg);
  addContentTitle(slide, "Tratativas em Andamento");

  slide.addText("Termos atingidos pelos principais agressores", {
    x: 0.4, y: 1.4, w: 12.5, h: 0.4,
    fontFace: FONT_HEADING, fontSize: 13, color: COLORS.primary,
  });

  const headerStyle = {
    bold: true, fontSize: 10, color: COLORS.white,
    fill: { color: COLORS.primary },
    fontFace: FONT_HEADING, valign: "middle" as const, align: "center" as const, margin: 0.05,
  };
  const cellStyle = {
    fontSize: 10, color: COLORS.textDark, fontFace: FONT_BODY,
    valign: "middle" as const, margin: 0.05,
  };

  const rows: pptxgen.TableRow[] = [
    [
      { text: "Agressor", options: headerStyle },
      { text: "Termos atingidos", options: headerStyle },
    ],
    ...data.termosAtingidosRows.slice(0, 8).map((r): pptxgen.TableRow => [
      { text: r.agressor, options: cellStyle },
      { text: r.termos, options: cellStyle },
    ]),
  ];

  slide.addTable(rows, {
    x: 0.6, y: 2.0, w: 12,
    colW: [4, 8],
    border: { type: "solid", pt: 0.5, color: COLORS.border },
    autoPage: false,
  });
}

// ─── SLIDE 19 - Tratativa em Prioridade ──────────────────────────────────────

function addTratativaPrioridadeSlide(pptx: pptxgen, data: PresentationData, logo: string | null, bg: string | null) {
  const slide = pptx.addSlide();
  addSlideChrome(slide, logo, bg);
  addContentTitle(slide, "Tratativa em Prioridade");

  // Fase/título — "Mediação" centralizdo abaixo do header, lado esquerdo
  slide.addText("Mediação", {
    x: 0.4, y: 1.72, w: 5.0, h: 0.45,
    fontFace: FONT_HEADING, fontSize: 16, bold: true, color: COLORS.cyan, align: "center",
  });

  // Seta entre colunas
  slide.addText("···→", {
    x: 5.55, y: 3.5, w: 0.9, h: 0.4,
    fontFace: FONT_BODY, fontSize: 12, color: COLORS.cyan, align: "center",
  });

  // Steps numerados — esquerda
  data.prioridadeMediacaoSteps.filter(s => s.text.trim()).slice(0, 6).forEach((step, i) => {
    slide.addText(`${i + 1}.`, {
      x: 0.4, y: 2.30 + i * 0.60, w: 0.35, h: 0.55,
      fontFace: FONT_HEADING, fontSize: 12, bold: true, color: COLORS.cyan, align: "center",
    });
    slide.addText(step.text, {
      x: 0.80, y: 2.30 + i * 0.60, w: 4.60, h: 0.55,
      fontFace: FONT_BODY, fontSize: 11, color: COLORS.textDark,
    });
  });

  // Nome do agressor — acima da evidência, lado direito
  slide.addText(data.prioridadeTexto || data.prioridadeAgressor || "—", {
    x: 6.50, y: 1.72, w: 6.40, h: 0.45,
    fontFace: FONT_BODY, fontSize: 13, bold: false, color: COLORS.cyan, align: "center",
  });

  // Box evidência arredondada (direita)
  slide.addShape("roundRect", {
    x: 6.50, y: 2.25, w: 6.40, h: 4.70,
    fill: { color: COLORS.white },
    line: { color: COLORS.cyan, width: 1.5 },
    rectRadius: 0.20,
  });

  // Imagem da evidência dentro do box
  if (data.prioridadeEvidenciaUrl) {
    const pad = 0.15;
    slide.addImage({
      data: data.prioridadeEvidenciaUrl,
      x: 6.50 + pad, y: 2.25 + pad,
      w: 6.40 - pad * 2, h: 4.70 - pad * 2,
      sizing: { type: "contain", w: 6.40 - pad * 2, h: 4.70 - pad * 2 },
    });
  }
}

// ─── SLIDE 20 - Negativações confirmadas ─────────────────────────────────────

function addNegativacoesSlide(pptx: pptxgen, data: PresentationData, logo: string | null, bg: string | null) {
  const slide = pptx.addSlide();
  addSlideChrome(slide, logo, bg);
  addContentTitle(slide, "Negativações confirmadas");
  slide.addText("Agressores: Principais", {
    x: 9.0, y: 0.92, w: 4, h: 0.4,
    fontFace: FONT_BODY, fontSize: 11, color: COLORS.textMuted, align: "right",
  });

  const headerStyle = {
    bold: true, fontSize: 11, color: COLORS.white,
    fill: { color: COLORS.primary },
    fontFace: FONT_HEADING, valign: "middle" as const, align: "center" as const, margin: 0.05,
  };
  const cellStyle = {
    fontSize: 10, color: COLORS.textDark, fontFace: FONT_BODY,
    valign: "middle" as const, margin: 0.05,
  };

  const rows: pptxgen.TableRow[] = [
    [
      { text: "Agressor", options: headerStyle },
      { text: "Data", options: headerStyle },
      { text: "Observação", options: headerStyle },
    ],
    ...data.negativacoes.slice(0, 8).map((r): pptxgen.TableRow => [
      { text: r.agressor, options: cellStyle },
      { text: r.data, options: { ...cellStyle, align: "center" as const } },
      { text: r.observacao, options: cellStyle },
    ]),
  ];

  slide.addTable(rows, {
    x: 0.4, y: 1.6, w: 12.5,
    colW: [3.5, 2, 7],
    border: { type: "solid", pt: 0.5, color: COLORS.border },
    autoPage: false,
  });
}

// ─── SLIDE 21 - Resolvidos ───────────────────────────────────────────────────

function addResolvidosSlide(pptx: pptxgen, data: PresentationData, logo: string | null, bg: string | null) {
  const slide = pptx.addSlide();
  addSlideChrome(slide, logo, bg);

  // ── Esquerda: título + texto + plataformas ────────────────────────────────
  slide.addText(data.resolvedTitle || "Agressores resolvidos", {
    x: 0.4, y: 0.85, w: 7, h: 0.9,
    fontFace: FONT_HEADING, fontSize: 26, bold: true, color: COLORS.primary,
  });

  slide.addText(
    "A Branddi atuou 24/7 em todas as plataformas para Detectar, Classificar e Remover.",
    { x: 0.4, y: 1.85, w: 7, h: 0.55, fontFace: FONT_BODY, fontSize: 11, color: COLORS.textDark }
  );

  // "Onde atuamos:" + ícones de plataforma em linha
  slide.addText("Onde atuamos:", {
    x: 0.4, y: 2.55, w: 7, h: 0.35,
    fontFace: FONT_HEADING, fontSize: 11, bold: true, color: COLORS.primary,
  });

  // Caixa cinza com ícones das plataformas (SVG/texto como fallback)
  slide.addShape("rect", {
    x: 0.4, y: 3.0, w: 6.8, h: 1.4,
    fill: { color: "F1F5F9" }, line: { color: COLORS.border, width: 0.5 },
  });

  // Ícones de plataforma como texto emoji (funciona em qualquer PPT)
  const plataformas = [
    { emoji: "🔵", label: "Google" },
    { emoji: "🟠", label: "Google Shopping" },
    { emoji: "🟢", label: "Google Play" },
    { emoji: "🔷", label: "Bing" },
    { emoji: "⚫", label: "Apple" },
    { emoji: "📦", label: "Amazon Ads" },
  ];

  plataformas.forEach((p, i) => {
    const x = 0.55 + i * 1.1;
    slide.addText(`${p.emoji}\n${p.label}`, {
      x, y: 3.1, w: 1.0, h: 1.1,
      fontFace: FONT_BODY, fontSize: 7.5, color: COLORS.textDark,
      align: "center", valign: "middle",
    });
  });

  // ── Direita: cards de logos ───────────────────────────────────────────────
  slide.addText("Principais resolvidos:", {
    x: 7.5, y: 0.85, w: 6.0, h: 0.35,
    fontFace: FONT_HEADING, fontSize: 11, bold: true, color: COLORS.primary,
  });

  // 18 cards em 3 colunas, cada card 1.85" × 0.88"
  const resolvidos = data.resolved.slice(0, 18);
  resolvidos.forEach((r, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const cardX = 7.5 + col * 1.97;
    const cardY = 1.3 + row * 0.97;

    slide.addShape("roundRect", {
      x: cardX, y: cardY, w: 1.87, h: 0.82,
      fill: { color: COLORS.white },
      line: { color: COLORS.border, width: 0.5 },
      rectRadius: 0.04,
    });

    if (r.logoDataUrl) {
      slide.addImage({
        data: r.logoDataUrl,
        x: cardX + 0.12, y: cardY + 0.1, w: 1.63, h: 0.62,
        sizing: { type: "contain", w: 1.63, h: 0.62 },
      });
    } else {
      slide.addText(r.domain, {
        x: cardX, y: cardY, w: 1.87, h: 0.82,
        fontFace: FONT_BODY, fontSize: 7, color: COLORS.primary,
        align: "center", valign: "middle", bold: true,
      });
    }
  });
}

// ─── SLIDES 23-27 - Gráficos de Campanha ─────────────────────────────────────

function addCampanhaSlide(
  pptx: pptxgen, title: string, slideData: CampanhaSlideData,
  logo: string | null, bg: string | null
) {
  const slide = pptx.addSlide();
  addSlideChrome(slide, logo, bg);
  addContentTitle(slide, title);
  if (slideData.inicioAtuacao) {
    slide.addText(`Início da Atuação: ${slideData.inicioAtuacao}`, {
      x: 9.0, y: 0.92, w: 4, h: 0.4,
      fontFace: FONT_BODY, fontSize: 11, color: COLORS.textMuted, align: "right",
    });
  }

  // ─── LINHA SUPERIOR: Palavra-Chave É ───
  slide.addText(`Palavra-Chave é: "${slideData.keywordIs || "—"}"`, {
    x: 0.4, y: 1.35, w: 12.53, h: 0.38,
    fontFace: FONT_HEADING, fontSize: 12, bold: true, color: COLORS.primary, align: "center",
  });
  addChartFrame(slide, slideData.imageDataUrlIs, 0.4, 1.78, 12.53, 2.45);

  // ─── LINHA INFERIOR: Palavra-Chave Contém ───
  slide.addText(`Palavra-Chave contém: "${slideData.keywordContains || "—"}"`, {
    x: 0.4, y: 4.3, w: 12.53, h: 0.38,
    fontFace: FONT_HEADING, fontSize: 12, bold: true, color: COLORS.primary, align: "center",
  });
  addChartFrame(slide, slideData.imageDataUrlContains, 0.4, 4.73, 12.53, 2.45);

  // Análise (rodapé)
  if (slideData.analysis) {
    slide.addText(slideData.analysis, {
      x: 0.4, y: 7.25, w: 12.5, h: 0.45,
      fontFace: FONT_BODY, fontSize: 9, color: COLORS.textMuted, italic: true, align: "center",
    });
  }
}

// ─── SLIDES 28-29 - Análise de Saving (É e Contém em slides separados) ───────

function addSavingSlide(pptx: pptxgen, data: PresentationData, logo: string | null, bg: string | null) {
  // ── SLIDE 28: Palavra-Chave É ──────────────────────────────────────────────
  const slideIs = pptx.addSlide();
  addSlideChrome(slideIs, logo, bg);
  addContentTitle(slideIs, "Análise de Saving");
  if (data.saving.inicioAtuacao) {
    slideIs.addText(`Início da Atuação: ${data.saving.inicioAtuacao}`, {
      x: 9.0, y: 0.92, w: 4, h: 0.4,
      fontFace: FONT_BODY, fontSize: 11, color: COLORS.textMuted, align: "right",
    });
  }

  // Keyword label
  slideIs.addText(`Palavra-Chave é: "${data.saving.keywordIs || "—"}"`, {
    x: 0.6, y: 1.3, w: 12.13, h: 0.4,
    fontFace: FONT_HEADING, fontSize: 12, bold: true, color: COLORS.primary, align: "center",
  });

  // Box Saving
  slideIs.addShape("roundRect", {
    x: 0.6, y: 1.78, w: 5.8, h: 1.0,
    fill: { color: COLORS.cyan }, line: { type: "none" },
    rectRadius: 0.1,
  });
  slideIs.addText("Saving", {
    x: 0.6, y: 1.83, w: 5.8, h: 0.35,
    fontFace: FONT_HEADING, fontSize: 12, color: COLORS.white, align: "center",
  });
  slideIs.addText(`R$ ${data.saving.savingValue || "—"}`, {
    x: 0.6, y: 2.15, w: 5.8, h: 0.6,
    fontFace: FONT_HEADING, fontSize: 22, bold: true, color: COLORS.white, align: "center",
  });

  // Box ROI
  slideIs.addShape("roundRect", {
    x: 6.93, y: 1.78, w: 5.8, h: 1.0,
    fill: { color: COLORS.primary }, line: { type: "none" },
    rectRadius: 0.1,
  });
  slideIs.addText("ROI", {
    x: 6.93, y: 1.83, w: 5.8, h: 0.35,
    fontFace: FONT_HEADING, fontSize: 12, color: COLORS.white, align: "center",
  });
  slideIs.addText(data.saving.roiValue || "—", {
    x: 6.93, y: 2.15, w: 5.8, h: 0.6,
    fontFace: FONT_HEADING, fontSize: 22, bold: true, color: COLORS.cyan, align: "center",
  });

  // Tabela É (largura total)
  addChartFrame(slideIs, data.saving.tableImageIs, 0.6, 2.95, 12.13, 3.8);

  if (data.saving.analysis) {
    slideIs.addText(data.saving.analysis, {
      x: 0.4, y: 6.85, w: 12.5, h: 0.5,
      fontFace: FONT_BODY, fontSize: 10, color: COLORS.textMuted, italic: true, align: "center",
    });
  }

  // ── SLIDE 29: Palavra-Chave Contém ─────────────────────────────────────────
  const slideContains = pptx.addSlide();
  addSlideChrome(slideContains, logo, bg);
  addContentTitle(slideContains, "Análise de Saving");
  if (data.saving.inicioAtuacao) {
    slideContains.addText(`Início da Atuação: ${data.saving.inicioAtuacao}`, {
      x: 9.0, y: 0.92, w: 4, h: 0.4,
      fontFace: FONT_BODY, fontSize: 11, color: COLORS.textMuted, align: "right",
    });
  }

  // Keyword label
  slideContains.addText(`Palavra-Chave contém: "${data.saving.keywordContains || "—"}"`, {
    x: 0.6, y: 1.3, w: 12.13, h: 0.4,
    fontFace: FONT_HEADING, fontSize: 12, bold: true, color: COLORS.primary, align: "center",
  });

  // Box Saving
  slideContains.addShape("roundRect", {
    x: 0.6, y: 1.78, w: 5.8, h: 1.0,
    fill: { color: COLORS.cyan }, line: { type: "none" },
    rectRadius: 0.1,
  });
  slideContains.addText("Saving", {
    x: 0.6, y: 1.83, w: 5.8, h: 0.35,
    fontFace: FONT_HEADING, fontSize: 12, color: COLORS.white, align: "center",
  });
  slideContains.addText(`R$ ${data.saving.savingValue || "—"}`, {
    x: 0.6, y: 2.15, w: 5.8, h: 0.6,
    fontFace: FONT_HEADING, fontSize: 22, bold: true, color: COLORS.white, align: "center",
  });

  // Box ROI
  slideContains.addShape("roundRect", {
    x: 6.93, y: 1.78, w: 5.8, h: 1.0,
    fill: { color: COLORS.primary }, line: { type: "none" },
    rectRadius: 0.1,
  });
  slideContains.addText("ROI", {
    x: 6.93, y: 1.83, w: 5.8, h: 0.35,
    fontFace: FONT_HEADING, fontSize: 12, color: COLORS.white, align: "center",
  });
  slideContains.addText(data.saving.roiValue || "—", {
    x: 6.93, y: 2.15, w: 5.8, h: 0.6,
    fontFace: FONT_HEADING, fontSize: 22, bold: true, color: COLORS.cyan, align: "center",
  });

  // Tabela Contém (largura total)
  addChartFrame(slideContains, data.saving.tableImageContains, 0.6, 2.95, 12.13, 3.8);

  if (data.saving.analysis) {
    slideContains.addText(data.saving.analysis, {
      x: 0.4, y: 6.85, w: 12.5, h: 0.5,
      fontFace: FONT_BODY, fontSize: 10, color: COLORS.textMuted, italic: true, align: "center",
    });
  }
}

// ─── SLIDE 29 - Próximos Passos ──────────────────────────────────────────────

function addProximosPassosSlide(pptx: pptxgen, data: PresentationData, logo: string | null, bg: string | null) {
  const slide = pptx.addSlide();
  addSlideChrome(slide, logo, bg);
  addContentTitle(slide, "Próximos Passos");

  const enabledSteps = data.proximosPassos.filter((p) => p.enabled);
  enabledSteps.forEach((step, i) => {
    slide.addText(`${i + 1}.`, {
      x: 0.6, y: 1.7 + i * 0.7, w: 0.5, h: 0.5,
      fontFace: FONT_HEADING, fontSize: 16, bold: true, color: COLORS.cyan,
    });
    slide.addText(step.text, {
      x: 1.1, y: 1.7 + i * 0.7, w: 11.5, h: 0.5,
      fontFace: FONT_BODY, fontSize: 13, color: COLORS.textDark,
    });
  });
}

// ─── SLIDE 30 - Encerramento ─────────────────────────────────────────────────

function addEncerramentoSlide(pptx: pptxgen, coverBg: string | null, logo: string | null) {
  const slide = pptx.addSlide();

  if (coverBg) {
    slide.addImage({ data: coverBg, x: 0, y: 0, w: 13.333, h: 7.5, sizing: { type: "cover", w: 13.333, h: 7.5 } });
  } else {
    slide.background = { color: COLORS.primary };
  }

  if (logo) slide.addImage({ data: logo, x: 0.5, y: 0.4, w: 0.5, h: 0.5 });
  slide.addText("branddi", {
    x: 1.05, y: 0.42, w: 1.5, h: 0.4,
    fontFace: FONT_HEADING, fontSize: 16, bold: true, color: COLORS.white,
  });

  slide.addText("Você investe todos os dias para crescer.", {
    x: 0.6, y: 2.5, w: 12, h: 0.8,
    fontFace: FONT_HEADING, fontSize: 36, bold: true, color: COLORS.white,
  });
  slide.addText("E a Branddi garante que esse esforço não seja desperdiçado.", {
    x: 0.6, y: 3.4, w: 12, h: 0.8,
    fontFace: FONT_HEADING, fontSize: 22, color: COLORS.cyanLight,
  });

  slide.addText("Ficou com alguma dúvida? Entre em contato!", {
    x: 0.6, y: 5.0, w: 12, h: 0.4,
    fontFace: FONT_BODY, fontSize: 13, color: COLORS.white, italic: true,
  });

  slide.addText(
    "atendimento@branddi.com\n+55 11 92145-8912\nbranddi.com",
    {
      x: 0.6, y: 5.6, w: 12, h: 1.5,
      fontFace: FONT_BODY, fontSize: 13, color: COLORS.cyanLight,
    }
  );
}

// ─── Função principal ────────────────────────────────────────────────────────

export type SlidesAtivos = {
  bigNumbersTotal: boolean; bigNumbersMes: boolean;
  branddiScore: boolean; agressoresTotal: boolean; agressoresSemanal: boolean;
  termos1: boolean; slideVazio: boolean;
  shareKeyword: boolean; shareAgressor: boolean;
  afiliados: boolean; analiseBing: boolean; bingShare: boolean;
  shareConcorrentes: boolean; shareWhitelist: boolean;
  trademarkEvidencia: boolean; trademarkAprov: boolean;
  heatmap: boolean; evolucao: boolean;
  tratativas: boolean; termosAtingidos: boolean; prioridade: boolean; negativacoes: boolean;
  resolvidos: boolean; campanha: boolean; saving: boolean; proximosPassos: boolean;
};

export async function generatePresentationPpt(data: PresentationData, ativos?: Partial<SlidesAtivos>): Promise<void> {
  const a = ativos || {};
  // Só inclui o slide se explicitamente true, ou se não foi definido (undefined = padrão ligado)
  const on = (key: keyof SlidesAtivos): boolean => {
    const val = a[key];
    if (val === undefined) return true;   // não definido = ligado por padrão
    return val === true;                  // definido = respeita o valor exato
  };

  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = `Status Mensal - ${data.clientName}`;
  pptx.company = "Branddi";

  const [logoBase64, coverBg, slideBg] = await Promise.all([
    loadAsset("/branding/logo-branddi.png"),
    loadAsset("/branding/cover-bg.png"),
    loadAsset("/branding/slide-bg.png"),
  ]);

  // 1 - Capa (sempre)
  addCoverSlide(pptx, data, coverBg, logoBase64);
  // 2 - Divisor (sempre)
  addDividerSlide(pptx, "Brand Bidding", coverBg, logoBase64);
  // 3
  if (on("bigNumbersTotal")) addBigNumbersTotalSlide(pptx, data, logoBase64, slideBg);
  // 4
  if (on("bigNumbersMes")) addBigNumbersDuploSlide(pptx, data, logoBase64, slideBg);
  // 5
  if (on("branddiScore")) addBranddiScoreSlide(pptx, data, logoBase64, slideBg);
  // 6
  if (on("agressoresTotal")) addAgressoresSlide(pptx, data, "total", logoBase64, slideBg);
  // 7
  if (on("agressoresSemanal")) addAgressoresSlide(pptx, data, "semanal", logoBase64, slideBg);
  // 8
  if (on("termos1")) addAnaliseTermosSlide(pptx, data, 1, logoBase64, slideBg);
  // 9
  
  // 10
  if (on("slideVazio")) addEmptySlide(pptx, logoBase64, slideBg);
  // 11
  if (on("shareKeyword")) addShareSlide(pptx, data, "keyword", logoBase64, slideBg);
  // 12
  if (on("shareAgressor")) addShareSlide(pptx, data, "agressor", logoBase64, slideBg);
  // 12a
  if (on("afiliados")) addAfiliadosSlide(pptx, data, logoBase64, slideBg);
  // 12b
  if (on("analiseBing")) addAnaliseBingSlide(pptx, data, logoBase64, slideBg);
  // 12c
  if (on("bingShare")) addBingShareSlide(pptx, data, logoBase64, slideBg);
  // 12d
  if (on("shareConcorrentes")) addShareConcorrentesSlide(pptx, data, logoBase64, slideBg);
  // 12e
  if (on("shareWhitelist")) addShareWhitelistSlide(pptx, data, logoBase64, slideBg);
  // 13
  if (on("trademarkEvidencia")) addTrademarkEvidenciaSlide(pptx, data, logoBase64, slideBg);
  // 14
  if (on("trademarkAprov")) addTrademarkAprovSlide(pptx, data, logoBase64, slideBg);
  // 15
  if (on("heatmap")) addHeatmapSlide(pptx, data, logoBase64, slideBg);
  // 16
  if (on("evolucao")) addEvolucaoSlide(pptx, data, logoBase64, slideBg);
  // 17
  if (on("tratativas")) addTratativasSlide(pptx, data, logoBase64, slideBg);
  // 18
  if (on("termosAtingidos")) addTermosAtingidosSlide(pptx, data, logoBase64, slideBg);
  // 19
  if (on("prioridade")) addTratativaPrioridadeSlide(pptx, data, logoBase64, slideBg);
  // 20
  if (on("negativacoes")) addNegativacoesSlide(pptx, data, logoBase64, slideBg);
  // 21
  if (on("resolvidos")) addResolvidosSlide(pptx, data, logoBase64, slideBg);
  // 22 - divisor campanha (só se algum slide de campanha estiver ativo)
  if (on("campanha") || on("saving")) addDividerSlide(pptx, "Resultados de campanha", coverBg, logoBase64);
  // 23-27
  if (on("campanha")) {
    addCampanhaSlide(pptx, "CPC mensal", data.cpc, logoBase64, slideBg);
    addCampanhaSlide(pptx, "CTR mensal", data.ctr, logoBase64, slideBg);
    addCampanhaSlide(pptx, "Parcela de impressão mensal", data.parcelaImpressao, logoBase64, slideBg);
    addCampanhaSlide(pptx, "Porcentagem de impressão: 1ª posição (Mensal)", data.impressao1aPosicao, logoBase64, slideBg);
    addCampanhaSlide(pptx, "Porcentagem de impressão: Parte Superior (Mensal)", data.impressaoParteSuperior, logoBase64, slideBg);
  }
  // 28
  if (on("saving")) addSavingSlide(pptx, data, logoBase64, slideBg);
  // 29
  if (on("proximosPassos")) addProximosPassosSlide(pptx, data, logoBase64, slideBg);
  // 30 - Encerramento (sempre)
  addEncerramentoSlide(pptx, coverBg, logoBase64);

  const safeName = (data.clientName || "cliente").toLowerCase().replace(/\s+/g, "-");
  const fileName = `apresentacao-bb-${safeName}-${Date.now()}.pptx`;
  await pptx.writeFile({ fileName });
}
