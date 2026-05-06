import jsPDF, { GState } from "jspdf";
import autoTable from "jspdf-autotable";

// ── Types ────────────────────────────────────────────────────────────────────

export interface BbPdfData {
  clientName: string;
  reportType: "Semanal" | "Quinzenal";
  periodDays: string;
  periodLabel: string;
  metrics: {
    identificados: string;
    inativos: string;
    ocorrencias: string;
    notificados: string;
    eliminados: string;
    notificacoesEnviadas: string;
  };
  agressoresNovos?: string;
  agressoresTotal?: string;
  section1Text?: string;
  section2Text?: string;
  section3Text?: string;
  metricsAnalysis?: string;
  agressoresAnalysis?: string;
  heatmapAnalysis?: string;
  sectionsAtivas?: {
    metricas?: boolean;
    agressores?: boolean;
    heatmap?: boolean;
    contencao?: boolean;
    standby?: boolean;
    aprovacao?: boolean;
    resolvidos?: boolean;
  };
  heatmap: { nome: string; score: string; emoji?: string }[];
  contentionActions: { domain: string; status: string }[];
  standbyCases: { agressor: string; status: string; nextAction: string }[];
  awaitingApproval: string;
  resolved: string;
  imageAgressores: File | null;
  imageHeatmap: File | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.readAsDataURL(file);
  });
}

function getImageDimensions(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = dataUrl;
  });
}

async function urlToDataURL(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.readAsDataURL(blob);
  });
}

// ── PDF Generator ─────────────────────────────────────────────────────────────

export async function generateBbPdf(data: BbPdfData): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const PAGE_W = doc.internal.pageSize.getWidth();
  const PAGE_H = doc.internal.pageSize.getHeight();
  const MARGIN = 20;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  const BOTTOM_LIMIT = PAGE_H - MARGIN;

  // Convenience: check if a section is enabled (defaults to true if not specified)
  const sa = data.sectionsAtivas ?? {};
  function isOn(key: keyof NonNullable<BbPdfData["sectionsAtivas"]>): boolean {
    return sa[key] !== false;
  }

  // Load branding images
  let headerDataUrl = "";
  let watermarkDataUrl = "";
  try {
    headerDataUrl = await urlToDataURL("/branddi-header.png");
  } catch { /* skip if not found */ }
  try {
    watermarkDataUrl = await urlToDataURL("/branddi-watermark.png");
  } catch { /* skip if not found */ }

  // ── Watermark helper (drawn on current page) ──
  function drawWatermark() {
    if (!watermarkDataUrl) return;
    const wmH = 60;
    const wmW = 45;
    const x = PAGE_W - wmW - 5;
    const y2 = PAGE_H - wmH - 5;
    doc.saveGraphicsState();
    doc.setGState(new GState({ opacity: 0.07 }));
    doc.addImage(watermarkDataUrl, "PNG", x, y2, wmW, wmH);
    doc.restoreGraphicsState();
  }

  let y = MARGIN;

  // ── Guard: check page overflow and add new page if needed ──
  function checkPage(needed: number) {
    if (y + needed > BOTTOM_LIMIT) {
      drawWatermark();
      doc.addPage();
      y = MARGIN;
    }
  }

  // Auto-incrementing section number
  let sectionNum = 0;

  // ── Section header ──
  function sectionHeader(title: string) {
    sectionNum++;
    checkPage(14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(20, 20, 20);
    doc.text(`${sectionNum}. ${title}`, MARGIN, y);
    y += 7;
  }

  // ── Body text: line-by-line with per-line page break checks ──
  function bodyText(text: string, fontSize = 10.5) {
    if (!text.trim()) return;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSize);
    doc.setTextColor(50, 50, 50);
    const lines = doc.splitTextToSize(text, CONTENT_W) as string[];
    const lineH = fontSize * 0.42;
    for (const line of lines) {
      checkPage(lineH + 1);
      doc.text(line, MARGIN, y);
      y += lineH;
    }
    y += 2;
  }

  // ── Bullet item ──
  function bulletItem(label: string, rest?: string, fontSize = 10.5) {
    const bullet = "• ";
    const indent = MARGIN + 4;
    const textW = CONTENT_W - 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(fontSize);
    doc.setTextColor(30, 30, 30);

    const fullText = rest ? `${bullet}${label}: ${rest}` : `${bullet}${label}`;
    const lines = doc.splitTextToSize(fullText, textW) as string[];
    const lineH = fontSize * 0.42;
    lines.forEach((line: string, i: number) => {
      checkPage(lineH + 1);
      doc.setFont("helvetica", i === 0 ? "bold" : "normal");
      doc.text(line, i === 0 ? MARGIN : indent, y);
      y += lineH;
    });
    y += 1;
  }

  // ── Image block ──
  async function addImage(file: File | null, maxH = 80) {
    if (!file) return;
    const dataUrl = await fileToDataURL(file);
    const dims = await getImageDimensions(dataUrl);
    const ratio = dims.h / dims.w;
    const imgW = CONTENT_W;
    const imgH = Math.min(imgW * ratio, maxH);
    checkPage(imgH + 4);
    const ext = file.type === "image/jpeg" ? "JPEG" : "PNG";
    doc.addImage(dataUrl, ext, MARGIN, y, imgW, imgH);
    y += imgH + 5;
  }

  // ═══════════════════════════════════════════════════════════════════
  // HEADER IMAGE (page 1 only)
  // ═══════════════════════════════════════════════════════════════════
  if (headerDataUrl) {
    const headerH = 22;
    doc.addImage(headerDataUrl, "PNG", 0, 0, PAGE_W, headerH);
    y = headerH + 10;
  }

  // ═══════════════════════════════════════════════════════════════════
  // TITLE
  // ═══════════════════════════════════════════════════════════════════
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(15, 15, 15);
  const titleLines = doc.splitTextToSize(
    `Relatório ${data.reportType} de Brand Bidding`,
    CONTENT_W
  ) as string[];
  doc.text(titleLines, PAGE_W / 2, y + 5, { align: "center" });
  y += titleLines.length * 9 + 8;

  if (data.clientName) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(80, 80, 80);
    doc.text(data.clientName, PAGE_W / 2, y, { align: "center" });
    y += 5;
  }

  if (data.periodLabel) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Período: ${data.periodLabel}`, PAGE_W / 2, y, { align: "center" });
    y += 5;
  }

  // Divider line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 8;

  // Intro paragraph
  bodyText(
    "Este documento apresenta a consolidação dos resultados e o status das ações de monitoramento e contenção de Brand Bidding, garantindo a proteção da sua marca nos canais de busca.",
    10.5
  );
  y += 4;

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 1 — Métricas Consolidadas
  // ═══════════════════════════════════════════════════════════════════
  if (isOn("metricas")) {
    sectionHeader(`Métricas Consolidadas (Últimos ${data.periodDays} dias)`);
    bodyText("A tabela a seguir resume os principais indicadores de Brand Bidding.");
    y += 2;

    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [
        [
          "Identificados",
          "Inativos",
          "Ocorrências",
          "Notificados",
          "Eliminados",
          "Notificações Enviadas",
        ],
      ],
      body: [
        [
          data.metrics.identificados || "—",
          data.metrics.inativos || "—",
          data.metrics.ocorrencias || "—",
          data.metrics.notificados || "—",
          data.metrics.eliminados || "—",
          data.metrics.notificacoesEnviadas || "—",
        ],
      ],
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [30, 30, 30],
        fontStyle: "bold",
        fontSize: 9,
        halign: "center",
      },
      bodyStyles: {
        fontSize: 13,
        fontStyle: "bold",
        halign: "center",
        textColor: [20, 20, 20],
      },
      theme: "grid",
      tableLineColor: [200, 200, 200],
      tableLineWidth: 0.3,
    });

    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

    if (data.metricsAnalysis) {
      bodyText(data.metricsAnalysis);
    }
    y += 4;
  }

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 2 — Agressores Identificados
  // ═══════════════════════════════════════════════════════════════════
  if (isOn("agressores")) {
    sectionHeader("Agressores Identificados");
    const s2Default = `Durante as últimas ${data.reportType === "Semanal" ? "semana" : "duas semanas"}, foram identificados ${data.agressoresNovos || "—"} novos agressores, elevando o total para ${data.agressoresTotal || "—"} agressores ativos no período.`;
    bodyText(data.agressoresAnalysis || data.section2Text || s2Default);
    y += 3;

    await addImage(data.imageAgressores, 85);

    y += 4;
  }

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 3 — Heatmap
  // ═══════════════════════════════════════════════════════════════════
  if (isOn("heatmap")) {
    sectionHeader("Análise de Ofensores (Heatmap)");
    bodyText(data.heatmapAnalysis || data.section3Text || "");
    y += 3;

    await addImage(data.imageHeatmap, 100);

    y += 4;
  }

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 4 — Ações de Contenção
  // ═══════════════════════════════════════════════════════════════════
  const validActions = data.contentionActions.filter((a) => a.domain.trim());
  if (isOn("contencao") && validActions.length > 0) {
    sectionHeader("Status das Ações de Contenção");
    bodyText("Detalhe do andamento das principais tratativas com agressores:");
    y += 2;
    for (const action of validActions) {
      bulletItem(action.domain, action.status);
    }
    y += 4;
  }

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 5 — Standby
  // ═══════════════════════════════════════════════════════════════════
  const validStandby = data.standbyCases.filter((c) => c.agressor.trim());
  if (isOn("standby") && validStandby.length > 0) {
    sectionHeader("Casos em Standby e em Notificação Extrajudicial");
    bodyText(
      "Os seguintes casos estão em standby ou em processo de notificação extrajudicial, após esgotamento das tentativas de contato direto:"
    );
    y += 2;

    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [["Agressor", "Status", "Próxima Ação"]],
      body: validStandby.map((c) => [c.agressor, c.status, c.nextAction]),
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [30, 30, 30],
        fontStyle: "bold",
        fontSize: 9,
        halign: "center",
      },
      bodyStyles: { fontSize: 10, textColor: [40, 40, 40] },
      columnStyles: {
        0: { fontStyle: "bold" },
      },
      theme: "grid",
      tableLineColor: [200, 200, 200],
      tableLineWidth: 0.3,
    });

    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 6 — Aguardando Aprovação
  // ═══════════════════════════════════════════════════════════════════
  const approvalList = data.awaitingApproval
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (isOn("aprovacao") && approvalList.length > 0) {
    sectionHeader("Agressores Aguardando Aprovação");
    bodyText(
      "A lista abaixo inclui os agressores recém-identificados que aguardam aprovação para o início das tratativas:"
    );
    y += 2;
    for (const domain of approvalList) {
      bulletItem(domain);
    }
    y += 4;
  }

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 7 — Resolvidos
  // ═══════════════════════════════════════════════════════════════════
  const resolvedList = data.resolved
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (isOn("resolvidos") && resolvedList.length > 0) {
    sectionHeader("Agressores Resolvidos (Sucesso)");
    bodyText(
      "Os seguintes agressores tiveram suas atividades contidas com sucesso nos últimos dias:"
    );
    y += 2;
    for (const domain of resolvedList) {
      bulletItem(domain);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // WATERMARK — add to all pages
  // ═══════════════════════════════════════════════════════════════════
  drawWatermark(); // last page
  if (watermarkDataUrl) {
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i < totalPages; i++) {
      doc.setPage(i);
      const wmH = 60;
      const wmW = 45;
      doc.saveGraphicsState();
      doc.setGState(new GState({ opacity: 0.07 }));
      doc.addImage(watermarkDataUrl, "PNG", PAGE_W - wmW - 5, PAGE_H - wmH - 5, wmW, wmH);
      doc.restoreGraphicsState();
    }
    doc.setPage(totalPages);
  }

  // ── Download ──────────────────────────────────────────────────────────────
  const today = new Date().toISOString().split("T")[0];
  const filename = `relatorio-bb-${data.clientName || "cliente"}-${today}.pdf`
    .toLowerCase()
    .replace(/\s+/g, "-");
  doc.save(filename);
}
