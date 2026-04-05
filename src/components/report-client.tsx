"use client";

import { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  ImageIcon,
  ClipboardCopy,
  Plus,
  Trash2,
  Shield,
  Eye,
  FileDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { generateBbPdf } from "@/lib/generate-bb-pdf";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Metrics {
  identificados: string;
  inativos: string;
  ocorrencias: string;
  notificados: string;
  eliminados: string;
  notificacoesEnviadas: string;
}

interface HeatmapEntry {
  nome: string;
  score: string;
}

interface ContentionAction {
  domain: string;
  status: string;
}

interface StandbyCase {
  agressor: string;
  status: string;
  nextAction: string;
}

// ─── Steps ───────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Dados do Relatório" },
  { id: 2, label: "Seções Adicionais" },
  { id: 3, label: "Preview" },
];

// ─── Step Indicator ──────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((step, i) => (
        <div key={step.id} className="flex items-center">
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all",
                current > step.id
                  ? "bg-primary border-primary text-white"
                  : current === step.id
                  ? "border-primary text-primary bg-primary/5"
                  : "border-border text-muted-foreground bg-white"
              )}
            >
              {current > step.id ? <Check size={14} /> : step.id}
            </div>
            <span
              className={cn(
                "text-xs font-medium whitespace-nowrap",
                current === step.id ? "text-primary" : "text-muted-foreground"
              )}
            >
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={cn(
                "h-0.5 w-16 mx-1 mt-[-14px] transition-all",
                current > step.id ? "bg-primary" : "bg-border"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function SectionLabel({ number, title }: { number: number; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
        {number}
      </div>
      <h3 className="font-semibold text-sm text-foreground">{title}</h3>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function BrandBiddingClient() {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Identificação
  const [clientName, setClientName] = useState("");
  const [reportType, setReportType] = useState<"Semanal" | "Quinzenal">("Quinzenal");
  const [periodDays, setPeriodDays] = useState("14");
  const [periodLabel, setPeriodLabel] = useState("");

  // Métricas
  const [metrics, setMetrics] = useState<Metrics>({
    identificados: "",
    inativos: "",
    ocorrencias: "",
    notificados: "",
    eliminados: "",
    notificacoesEnviadas: "",
  });

  // Agressores
  const [agressoresNovos, setAgressoresNovos] = useState("");
  const [agressoresTotal, setAgressoresTotal] = useState("");

  // Heatmap
  const [heatmap, setHeatmap] = useState<HeatmapEntry[]>([{ nome: "", score: "" }]);

  // Textos das seções
  const [section1Text, setSection1Text] = useState(
    "A tabela a seguir resume os principais indicadores de Brand Bidding da última semana."
  );
  const [section2Text, setSection2Text] = useState("");
  const [section3Text, setSection3Text] = useState("");

  // Imagens para o PDF
  const [imageAgressores, setImageAgressores] = useState<File | null>(null);
  const [imageAgressoresPreview, setImageAgressoresPreview] = useState("");
  const [imageHeatmap, setImageHeatmap] = useState<File | null>(null);
  const [imageHeatmapPreview, setImageHeatmapPreview] = useState("");

  // Seções adicionais
  const [contentionActions, setContentionActions] = useState<ContentionAction[]>([
    { domain: "", status: "" },
  ]);
  const [standbyCases, setStandbyCases] = useState<StandbyCase[]>([]);
  const [awaitingApproval, setAwaitingApproval] = useState("");
  const [resolved, setResolved] = useState("");

  const [generatingPdf, setGeneratingPdf] = useState(false);

  const fileInputAgressoresRef = useRef<HTMLInputElement>(null);
  const fileInputHeatmapRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (imageAgressoresPreview) URL.revokeObjectURL(imageAgressoresPreview);
      if (imageHeatmapPreview) URL.revokeObjectURL(imageHeatmapPreview);
    };
  }, []); // eslint-disable-line

  // ── Image handling ──────────────────────────────────────────────────────────

  function setPdfImage(slot: "agressores" | "heatmap", file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Apenas imagens são aceitas (PNG, JPG, etc.)");
      return;
    }
    const url = URL.createObjectURL(file);
    if (slot === "agressores") {
      if (imageAgressoresPreview) URL.revokeObjectURL(imageAgressoresPreview);
      setImageAgressores(file);
      setImageAgressoresPreview(url);
    } else {
      if (imageHeatmapPreview) URL.revokeObjectURL(imageHeatmapPreview);
      setImageHeatmap(file);
      setImageHeatmapPreview(url);
    }
  }

  function clearPdfImage(slot: "agressores" | "heatmap") {
    if (slot === "agressores") {
      if (imageAgressoresPreview) URL.revokeObjectURL(imageAgressoresPreview);
      setImageAgressores(null);
      setImageAgressoresPreview("");
    } else {
      if (imageHeatmapPreview) URL.revokeObjectURL(imageHeatmapPreview);
      setImageHeatmap(null);
      setImageHeatmapPreview("");
    }
  }

  // ── Heatmap helpers ──────────────────────────────────────────────────────────

  function updateHeatmap(index: number, field: keyof HeatmapEntry, value: string) {
    setHeatmap((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }

  function addHeatmapEntry() {
    setHeatmap((prev) => [...prev, { nome: "", score: "" }]);
  }

  function removeHeatmapEntry(index: number) {
    setHeatmap((prev) => prev.filter((_, i) => i !== index));
  }

  // ── Contention helpers ───────────────────────────────────────────────────────

  function updateContention(index: number, field: keyof ContentionAction, value: string) {
    setContentionActions((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function addContention() {
    setContentionActions((prev) => [...prev, { domain: "", status: "" }]);
  }

  function removeContention(index: number) {
    setContentionActions((prev) => prev.filter((_, i) => i !== index));
  }

  // ── Standby helpers ──────────────────────────────────────────────────────────

  function updateStandby(index: number, field: keyof StandbyCase, value: string) {
    setStandbyCases((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function addStandby() {
    setStandbyCases((prev) => [...prev, { agressor: "", status: "", nextAction: "" }]);
  }

  function removeStandby(index: number) {
    setStandbyCases((prev) => prev.filter((_, i) => i !== index));
  }

  // ── Report text ──────────────────────────────────────────────────────────────

  function generateReportText(): string {
    const lines: string[] = [];

    lines.push(`RELATÓRIO ${reportType.toUpperCase()} DE BRAND BIDDING`);
    if (clientName) lines.push(`Cliente: ${clientName}`);
    lines.push(`Período: ${periodLabel || `Últimos ${periodDays} dias`}`);
    lines.push("");

    lines.push("1. MÉTRICAS CONSOLIDADAS");
    if (section1Text) lines.push(section1Text);
    lines.push("");
    lines.push(`Identificados\tInativos\tOcorrências\tNotificados\tEliminados\tNotificações Enviadas`);
    lines.push(
      `${metrics.identificados || "—"}\t${metrics.inativos || "—"}\t${metrics.ocorrencias || "—"}\t${metrics.notificados || "—"}\t${metrics.eliminados || "—"}\t${metrics.notificacoesEnviadas || "—"}`
    );
    lines.push("");

    lines.push("2. AGRESSORES IDENTIFICADOS");
    lines.push(
      section2Text ||
        `Durante as últimas ${reportType === "Semanal" ? "semana" : "duas semanas"}, foram identificados ${agressoresNovos || "—"} novos agressores, elevando o total para ${agressoresTotal || "—"} agressores ativos no período.`
    );
    lines.push("");

    lines.push("3. ANÁLISE DE OFENSORES (HEATMAP)");
    if (section3Text) lines.push(section3Text);
    const validHeatmap = heatmap.filter((h) => h.nome.trim());
    if (validHeatmap.length > 0) {
      lines.push("");
      validHeatmap.forEach((h) => lines.push(`  ${h.score}\t${h.nome}`));
    }
    lines.push("");

    const validActions = contentionActions.filter((a) => a.domain.trim());
    if (validActions.length > 0) {
      lines.push("4. STATUS DAS AÇÕES DE CONTENÇÃO");
      validActions.forEach((a) => lines.push(`• ${a.domain}: ${a.status}`));
      lines.push("");
    }

    const validStandby = standbyCases.filter((c) => c.agressor.trim());
    if (validStandby.length > 0) {
      lines.push("5. CASOS EM STANDBY E EM NOTIFICAÇÃO EXTRAJUDICIAL");
      lines.push("Agressor\tStatus\tPróxima Ação");
      validStandby.forEach((c) => lines.push(`${c.agressor}\t${c.status}\t${c.nextAction}`));
      lines.push("");
    }

    const approvalList = awaitingApproval.split("\n").map((l) => l.trim()).filter(Boolean);
    if (approvalList.length > 0) {
      lines.push("6. AGRESSORES AGUARDANDO APROVAÇÃO");
      approvalList.forEach((d) => lines.push(`• ${d}`));
      lines.push("");
    }

    const resolvedList = resolved.split("\n").map((l) => l.trim()).filter(Boolean);
    if (resolvedList.length > 0) {
      lines.push("7. AGRESSORES RESOLVIDOS (SUCESSO)");
      resolvedList.forEach((d) => lines.push(`• ${d}`));
    }

    return lines.join("\n");
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(generateReportText());
      toast.success("Relatório copiado para a área de transferência!");
    } catch {
      toast.error("Erro ao copiar. Selecione o texto manualmente.");
    }
  }

  async function downloadPdf() {
    setGeneratingPdf(true);
    try {
      await generateBbPdf({
        clientName,
        reportType,
        periodDays,
        periodLabel,
        metrics,
        agressoresNovos,
        agressoresTotal,
        section1Text,
        section2Text,
        section3Text,
        heatmap: heatmap.filter((h) => h.nome.trim()),
        contentionActions,
        standbyCases,
        awaitingApproval,
        resolved,
        imageAgressores,
        imageHeatmap,
      });
      toast.success("PDF gerado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar PDF. Tente novamente.");
    } finally {
      setGeneratingPdf(false);
    }
  }

  // ── Step 1 — Dados do Relatório ──────────────────────────────────────────────

  function renderStep1() {
    return (
      <div className="space-y-5">

        {/* Identificação */}
        <div className="rounded-xl border border-border bg-white p-5">
          <SectionLabel number={0} title="Identificação" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                Cliente <span className="text-muted-foreground font-normal">(opcional)</span>
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Nome do cliente..."
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Período</label>
              <input
                type="text"
                value={periodLabel}
                onChange={(e) => setPeriodLabel(e.target.value)}
                placeholder="Ex: 01 Mar - 14 Mar"
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>
          <div className="mt-3 flex items-end gap-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Tipo de relatório</label>
              <div className="flex gap-2">
                {(["Semanal", "Quinzenal"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setReportType(t);
                      setPeriodDays(t === "Semanal" ? "7" : "14");
                    }}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-sm font-medium border transition-all",
                      reportType === t
                        ? "bg-primary text-white border-primary"
                        : "border-border text-muted-foreground hover:border-primary/40"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="w-28">
              <label className="block text-xs text-muted-foreground mb-1">Nº de dias</label>
              <input
                type="number"
                min="1"
                value={periodDays}
                onChange={(e) => setPeriodDays(e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-1.5 text-sm text-center font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* Section 1 — Métricas */}
        <div className="rounded-xl border border-border bg-white p-5">
          <SectionLabel number={1} title="Métricas Consolidadas (Big Numbers)" />
          <div className="grid grid-cols-3 gap-3 mb-4">
            {(
              [
                { key: "identificados", label: "Identificados" },
                { key: "inativos", label: "Inativos" },
                { key: "ocorrencias", label: "Ocorrências" },
                { key: "notificados", label: "Notificados" },
                { key: "eliminados", label: "Eliminados" },
                { key: "notificacoesEnviadas", label: "Notificações Enviadas" },
              ] as { key: keyof Metrics; label: string }[]
            ).map(({ key, label }) => (
              <div key={key}>
                <label className="block text-xs text-muted-foreground mb-1">{label}</label>
                <input
                  type="number"
                  min="0"
                  value={metrics[key]}
                  onChange={(e) =>
                    setMetrics((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  placeholder="—"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm text-center font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Texto introdutório</label>
            <textarea
              value={section1Text}
              onChange={(e) => setSection1Text(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>

        {/* Section 2 — Agressores */}
        <div className="rounded-xl border border-border bg-white p-5">
          <SectionLabel number={2} title="Agressores Identificados" />
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Novos no período</label>
              <input
                type="number"
                min="0"
                value={agressoresNovos}
                onChange={(e) => setAgressoresNovos(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm text-center font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Total ativo</label>
              <input
                type="number"
                min="0"
                value={agressoresTotal}
                onChange={(e) => setAgressoresTotal(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm text-center font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs text-muted-foreground mb-1">Texto da seção</label>
            <textarea
              value={section2Text}
              onChange={(e) => setSection2Text(e.target.value)}
              rows={3}
              placeholder="Durante as últimas duas semanas, foram identificados X novos agressores..."
              className="w-full rounded-lg border border-border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          {/* Imagem gráfico de agressores */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Print do gráfico de agressores (opcional)
            </p>
            <div
              onDrop={(e) => { e.preventDefault(); setPdfImage("agressores", e.dataTransfer.files[0] ?? null); }}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => !imageAgressoresPreview && fileInputAgressoresRef.current?.click()}
              className={cn(
                "relative rounded-lg border-2 border-dashed transition-all overflow-hidden",
                imageAgressoresPreview
                  ? "border-primary/30 bg-primary/5 cursor-default"
                  : "border-border hover:border-primary/50 hover:bg-primary/5 cursor-pointer flex items-center justify-center gap-2 py-4"
              )}
            >
              <input ref={fileInputAgressoresRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => setPdfImage("agressores", e.target.files?.[0] ?? null)} />
              {imageAgressoresPreview ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageAgressoresPreview} alt="Gráfico de agressores" className="w-full object-contain max-h-48" />
                  <button onClick={(e) => { e.stopPropagation(); clearPdfImage("agressores"); }}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80">
                    <X size={11} />
                  </button>
                </>
              ) : (
                <>
                  <ImageIcon size={14} className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Clique ou arraste o print do gráfico</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Section 3 — Heatmap */}
        <div className="rounded-xl border border-border bg-white p-5">
          <SectionLabel number={3} title="Análise de Ofensores (Heatmap)" />
          <div className="mb-4">
            <label className="block text-xs text-muted-foreground mb-1">Texto da seção</label>
            <textarea
              value={section3Text}
              onChange={(e) => setSection3Text(e.target.value)}
              rows={4}
              placeholder="O agressor X demonstrou a maior agressividade no período analisado..."
              className="w-full rounded-lg border border-border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* Agressores do heatmap */}
          <div className="mb-4">
            <label className="block text-xs text-muted-foreground mb-2">
              Top agressores do heatmap <span className="font-normal">(opcional)</span>
            </label>
            <div className="space-y-2">
              {heatmap.map((h, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={h.score}
                    onChange={(e) => updateHeatmap(i, "score", e.target.value)}
                    placeholder="Score (ex: 10.00)"
                    className="w-28 shrink-0 rounded-lg border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <input
                    type="text"
                    value={h.nome}
                    onChange={(e) => updateHeatmap(i, "nome", e.target.value)}
                    placeholder="dominio.com.br"
                    className="flex-1 rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  {heatmap.length > 1 && (
                    <button
                      onClick={() => removeHeatmapEntry(i)}
                      className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5 border border-border transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addHeatmapEntry}
                className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
              >
                <Plus size={14} />
                Adicionar agressor
              </button>
            </div>
          </div>

          {/* Imagem heatmap */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Print do heatmap (opcional)
            </p>
            <div
              onDrop={(e) => { e.preventDefault(); setPdfImage("heatmap", e.dataTransfer.files[0] ?? null); }}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => !imageHeatmapPreview && fileInputHeatmapRef.current?.click()}
              className={cn(
                "relative rounded-lg border-2 border-dashed transition-all overflow-hidden",
                imageHeatmapPreview
                  ? "border-primary/30 bg-primary/5 cursor-default"
                  : "border-border hover:border-primary/50 hover:bg-primary/5 cursor-pointer flex items-center justify-center gap-2 py-4"
              )}
            >
              <input ref={fileInputHeatmapRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => setPdfImage("heatmap", e.target.files?.[0] ?? null)} />
              {imageHeatmapPreview ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageHeatmapPreview} alt="Heatmap" className="w-full object-contain max-h-48" />
                  <button onClick={(e) => { e.stopPropagation(); clearPdfImage("heatmap"); }}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80">
                    <X size={11} />
                  </button>
                </>
              ) : (
                <>
                  <ImageIcon size={14} className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Clique ou arraste o print do heatmap</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            onClick={() => setStep(2)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-all shadow-sm"
          >
            Próximo
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    );
  }

  // ── Step 2 — Seções Adicionais ────────────────────────────────────────────────

  function renderStep2() {
    return (
      <div className="space-y-5">
        {/* Section 4 */}
        <div className="rounded-xl border border-border bg-white p-5">
          <SectionLabel number={4} title="Status das Ações de Contenção" />
          <p className="text-xs text-muted-foreground mb-3">
            Descreva o status atual das tratativas com cada agressor.
          </p>
          <div className="space-y-3">
            {contentionActions.map((item, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={item.domain}
                  onChange={(e) => updateContention(i, "domain", e.target.value)}
                  placeholder="dominio.com.br"
                  className="w-44 shrink-0 rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <input
                  type="text"
                  value={item.status}
                  onChange={(e) => updateContention(i, "status", e.target.value)}
                  placeholder="Descreva o status atual desta tratativa..."
                  className="flex-1 rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                {contentionActions.length > 1 && (
                  <button
                    onClick={() => removeContention(i)}
                    className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5 border border-border transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addContention}
              className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
            >
              <Plus size={14} />
              Adicionar agressor
            </button>
          </div>
        </div>

        {/* Section 5 */}
        <div className="rounded-xl border border-border bg-white p-5">
          <SectionLabel number={5} title="Casos em Standby e em Notificação Extrajudicial" />
          {standbyCases.length === 0 && (
            <p className="text-xs text-muted-foreground italic mb-3">
              Nenhum caso em standby no período.
            </p>
          )}
          <div className="space-y-3">
            {standbyCases.map((item, i) => (
              <div key={i} className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  value={item.agressor}
                  onChange={(e) => updateStandby(i, "agressor", e.target.value)}
                  placeholder="dominio.com.br"
                  className="rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <input
                  type="text"
                  value={item.status}
                  onChange={(e) => updateStandby(i, "status", e.target.value)}
                  placeholder="Status atual..."
                  className="rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={item.nextAction}
                    onChange={(e) => updateStandby(i, "nextAction", e.target.value)}
                    placeholder="Próxima ação..."
                    className="flex-1 rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <button
                    onClick={() => removeStandby(i)}
                    className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5 border border-border transition-colors shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={addStandby}
              className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
            >
              <Plus size={14} />
              Adicionar caso
            </button>
          </div>
        </div>

        {/* Sections 6 & 7 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-white p-5">
            <SectionLabel number={6} title="Aguardando Aprovação" />
            <p className="text-xs text-muted-foreground mb-2">Um domínio por linha.</p>
            <textarea
              value={awaitingApproval}
              onChange={(e) => setAwaitingApproval(e.target.value)}
              rows={6}
              placeholder={"concorrente1.com.br\nconcorrente2.com.br"}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
            />
          </div>
          <div className="rounded-xl border border-border bg-white p-5">
            <SectionLabel number={7} title="Resolvidos (Sucesso)" />
            <p className="text-xs text-muted-foreground mb-2">Um domínio por linha.</p>
            <textarea
              value={resolved}
              onChange={(e) => setResolved(e.target.value)}
              rows={6}
              placeholder={"sucesso1.com.br\nsucesso2.com.br"}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
            />
          </div>
        </div>

        <div className="flex justify-between pt-1">
          <button
            onClick={() => setStep(1)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-slate-50 transition-all"
          >
            <ChevronLeft size={15} />
            Voltar
          </button>
          <button
            onClick={() => setStep(3)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-all shadow-sm"
          >
            Ver Preview
            <Eye size={15} />
          </button>
        </div>
      </div>
    );
  }

  // ── Step 3 — Preview ──────────────────────────────────────────────────────────

  function renderStep3() {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground">Preview do Relatório</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Revise o conteúdo e baixe o PDF no padrão Branddi.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-border hover:bg-slate-50 transition-all"
            >
              <ClipboardCopy size={14} />
              Copiar texto
            </button>
            <button
              onClick={downloadPdf}
              disabled={generatingPdf}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-all shadow-sm disabled:opacity-60"
            >
              {generatingPdf ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
              {generatingPdf ? "Gerando..." : "Baixar PDF"}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-slate-50 overflow-hidden">
          {/* Header */}
          <div className="bg-[#0d3349] px-6 py-4">
            <div className="flex items-center gap-2 mb-1">
              <Shield size={16} className="text-white/80" />
              <span className="text-white/80 text-xs font-medium uppercase tracking-wider">
                Branddi Monitor
              </span>
            </div>
            <h2 className="text-white font-bold text-lg">
              Relatório {reportType} de Brand Bidding
            </h2>
            {clientName && (
              <p className="text-white/70 text-sm mt-0.5">{clientName}</p>
            )}
            {periodLabel && (
              <p className="text-white/60 text-xs mt-0.5">Período: {periodLabel}</p>
            )}
          </div>

          {/* Scrollable content */}
          <div className="p-6 space-y-6 max-h-[600px] overflow-y-auto">

            {/* Section 1 */}
            <div>
              <h3 className="font-bold text-foreground mb-2 text-sm">
                1. Métricas Consolidadas (Últimos {periodDays} dias)
              </h3>
              {section1Text && (
                <p className="text-sm text-muted-foreground mb-3">{section1Text}</p>
              )}
              <div className="grid grid-cols-6 gap-2">
                {[
                  { label: "Identificados", value: metrics.identificados },
                  { label: "Inativos", value: metrics.inativos },
                  { label: "Ocorrências", value: metrics.ocorrencias },
                  { label: "Notificados", value: metrics.notificados },
                  { label: "Eliminados", value: metrics.eliminados },
                  { label: "Notificações Enviadas", value: metrics.notificacoesEnviadas },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="rounded-xl border border-border bg-white p-3 text-center"
                  >
                    <div className="text-xl font-bold text-primary">{value || "—"}</div>
                    <div className="text-[10px] text-muted-foreground mt-1 leading-tight">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 2 */}
            <div>
              <h3 className="font-bold text-foreground mb-2 text-sm">
                2. Agressores Identificados
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                {section2Text ||
                  `Durante as últimas ${reportType === "Semanal" ? "semana" : "duas semanas"}, foram identificados ${agressoresNovos || "—"} novos agressores, elevando o total para ${agressoresTotal || "—"} agressores ativos no período.`}
              </p>
              {imageAgressoresPreview && (
                <div className="rounded-xl overflow-hidden border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageAgressoresPreview} alt="Gráfico de agressores" className="w-full object-contain max-h-56" />
                </div>
              )}
            </div>

            {/* Section 3 */}
            <div>
              <h3 className="font-bold text-foreground mb-2 text-sm">
                3. Análise de Ofensores (Heatmap)
              </h3>
              {section3Text && (
                <p className="text-sm text-muted-foreground mb-3">{section3Text}</p>
              )}
              {imageHeatmapPreview && (
                <div className="rounded-xl overflow-hidden border border-border mb-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageHeatmapPreview} alt="Heatmap de agressores" className="w-full object-contain max-h-56" />
                </div>
              )}
              {heatmap.some((h) => h.nome.trim()) && (
                <div className="space-y-1.5">
                  {heatmap.filter((h) => h.nome.trim()).map((h, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-white border border-border/60"
                    >
                      <span className="text-xs font-mono font-bold text-primary w-14 shrink-0">{h.score}</span>
                      <span className="text-sm text-foreground">{h.nome}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 4 */}
            {contentionActions.some((a) => a.domain.trim()) && (
              <div>
                <h3 className="font-bold text-foreground mb-2 text-sm">
                  4. Status das Ações de Contenção
                </h3>
                <ul className="space-y-2">
                  {contentionActions
                    .filter((a) => a.domain.trim())
                    .map((a, i) => (
                      <li key={i} className="text-sm text-foreground">
                        <span className="font-semibold">{a.domain}:</span>{" "}
                        <span className="text-muted-foreground">{a.status}</span>
                      </li>
                    ))}
                </ul>
              </div>
            )}

            {/* Section 5 */}
            {standbyCases.some((c) => c.agressor.trim()) && (
              <div>
                <h3 className="font-bold text-foreground mb-2 text-sm">
                  5. Casos em Standby e em Notificação Extrajudicial
                </h3>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Agressor</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Status</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Próxima Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standbyCases
                      .filter((c) => c.agressor.trim())
                      .map((c, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="py-2 px-3 font-medium">{c.agressor}</td>
                          <td className="py-2 px-3 text-muted-foreground">{c.status}</td>
                          <td className="py-2 px-3 text-muted-foreground">{c.nextAction}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Section 6 */}
            {awaitingApproval.trim() && (
              <div>
                <h3 className="font-bold text-foreground mb-2 text-sm">
                  6. Agressores Aguardando Aprovação
                </h3>
                <ul className="space-y-1">
                  {awaitingApproval.split("\n").filter(Boolean).map((d, i) => (
                    <li key={i} className="text-sm text-muted-foreground">• {d.trim()}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Section 7 */}
            {resolved.trim() && (
              <div>
                <h3 className="font-bold text-foreground mb-2 text-sm">
                  7. Agressores Resolvidos (Sucesso)
                </h3>
                <ul className="space-y-1">
                  {resolved.split("\n").filter(Boolean).map((d, i) => (
                    <li key={i} className="text-sm text-muted-foreground">• {d.trim()}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Raw text */}
        <details className="rounded-xl border border-border overflow-hidden">
          <summary className="px-4 py-3 text-sm font-medium cursor-pointer hover:bg-slate-50 text-muted-foreground">
            Ver texto puro para copiar
          </summary>
          <pre className="p-4 text-xs font-mono bg-slate-50 whitespace-pre-wrap max-h-64 overflow-y-auto border-t border-border text-foreground">
            {generateReportText()}
          </pre>
        </details>

        <div className="flex justify-between pt-1">
          <button
            onClick={() => setStep(2)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-slate-50 transition-all"
          >
            <ChevronLeft size={15} />
            Voltar
          </button>
          <button
            onClick={downloadPdf}
            disabled={generatingPdf}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-all shadow-sm disabled:opacity-60"
          >
            {generatingPdf ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
            {generatingPdf ? "Gerando..." : "Baixar PDF"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="border-b border-border/60 bg-white px-6 py-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield size={18} className="text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Relatório Brand Bidding</h1>
            <p className="text-xs text-muted-foreground">
              Preencha os dados e gere o PDF no padrão Branddi
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          <StepIndicator current={step} />
          <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
          </div>
        </div>
      </div>
    </div>
  );
}
