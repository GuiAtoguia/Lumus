"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  ChevronRight, ChevronLeft, Check, Loader2,
  Plus, Trash2, Shield, Eye, EyeOff, FileDown, RefreshCw, Sparkles, Link, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { generateBbPdf } from "@/lib/generate-bb-pdf";
import { ChartSection, type AnalysisOptions } from "@/components/chart-section";

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
  emoji: string; // ✅ 🚫 🔔 🤝 ou ""
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
                  ? "bg-cyan-500 border-cyan-500 text-white"
                  : current === step.id
                  ? "border-cyan-400 text-cyan-400 bg-cyan-400/10"
                  : "border-white/20 text-white/30 bg-white/5"
              )}
            >
              {current > step.id ? <Check size={14} /> : step.id}
            </div>
            <span className={cn("text-xs font-medium whitespace-nowrap", current === step.id ? "text-cyan-400" : "text-white/40")}>
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={cn("h-0.5 w-16 mx-1 mt-[-14px] transition-all", current > step.id ? "bg-cyan-500" : "bg-white/10")} />
          )}
        </div>
      ))}
    </div>
  );
}

function SectionLabel({ number, title }: { number: number; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold flex items-center justify-center border border-cyan-500/30">
        {number}
      </div>
      <h3 className="font-semibold text-sm text-white">{title}</h3>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function BrandBiddingClient() {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Identificação
  const [clientName, setClientName] = useState("");
  const [reportType, setReportType] = useState<"Semanal" | "Quinzenal">("Semanal");
  const [periodDays, setPeriodDays] = useState("7");
  const [periodLabel, setPeriodLabel] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  // Métricas
  const [metrics, setMetrics] = useState<Metrics>({
    identificados: "",
    inativos: "",
    ocorrencias: "",
    notificados: "",
    eliminados: "",
    notificacoesEnviadas: "",
  });

  // Análise IA dos Big Numbers (métricas)
  const [metricsAnalysis, setMetricsAnalysis] = useState("");
  const [metricsOptions, setMetricsOptions] = useState<AnalysisOptions | null>(null);
  const [analyzingMetrics, setAnalyzingMetrics] = useState(false);

  // Toggles de seções ativas (para renumeração automática)
  const [sectionsAtivas, setSectionsAtivas] = useState({
    metricas: true,
    agressores: true,
    heatmap: true,
    contencao: true,
    standby: true,
    aprovacao: true,
    resolvidos: true,
  });

  // Retorna os números corretos para cada seção baseado nos toggles E se tem conteúdo
  const sectionNumbers = (() => {
    const keys = ["metricas","agressores","heatmap","contencao","standby","aprovacao","resolvidos"] as const;
    let n = 0;
    const nums: Record<string, number> = {};
    keys.forEach((k) => { if (sectionsAtivas[k]) { n++; nums[k] = n; } else { nums[k] = 0; } });
    return nums;
  })();


  // Análises das seções (geradas pela IA, editáveis)
  const [agressoresAnalysis, setAgressoresAnalysis] = useState("");
  const [heatmapAnalysis, setHeatmapAnalysis] = useState("");

  // Heatmap
  const [heatmap, setHeatmap] = useState<HeatmapEntry[]>([{ nome: "", score: "", emoji: "" }]);

  // Imagens + análises da IA
  const [imageAgressores, setImageAgressores] = useState<File | null>(null);
  const [imageAgressoresPreview, setImageAgressoresPreview] = useState("");
  const [agressoresOptions, setAgressoresOptions] = useState<AnalysisOptions | null>(null);
  const [analyzingAgressores, setAnalyzingAgressores] = useState(false);

  const [imageHeatmap, setImageHeatmap] = useState<File | null>(null);
  const [imageHeatmapPreview, setImageHeatmapPreview] = useState("");
  const [heatmapOptions, setHeatmapOptions] = useState<AnalysisOptions | null>(null);
  const [analyzingHeatmap, setAnalyzingHeatmap] = useState(false);

  // Pipefy token + import de cards (seção 4)
  const [pipefyToken, setPipefyToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [cardUrls, setCardUrls] = useState<string[]>(["", "", ""]);
  const [loadingImport, setLoadingImport] = useState(false);

  // Seções adicionais
  const [contentionActions, setContentionActions] = useState<ContentionAction[]>([{ domain: "", status: "" }]);
  const [standbyCases, setStandbyCases] = useState<StandbyCase[]>([]);
  const [awaitingApproval, setAwaitingApproval] = useState("");
  const [resolved, setResolved] = useState("");

  // Renumeração levando conteúdo em conta (para preview)
  const previewNumbers = (() => {
    const temConteudo = {
      metricas: sectionsAtivas.metricas,
      agressores: sectionsAtivas.agressores,
      heatmap: sectionsAtivas.heatmap,
      contencao: sectionsAtivas.contencao && contentionActions.some(a => a.domain.trim()),
      standby: sectionsAtivas.standby && standbyCases.some(c => c.agressor.trim()),
      aprovacao: sectionsAtivas.aprovacao && awaitingApproval.trim().length > 0,
      resolvidos: sectionsAtivas.resolvidos && resolved.trim().length > 0,
    };
    const keys = ["metricas","agressores","heatmap","contencao","standby","aprovacao","resolvidos"] as const;
    let n = 0;
    const nums: Record<string, number> = {};
    keys.forEach((k) => { if (temConteudo[k]) { n++; nums[k] = n; } else { nums[k] = 0; } });
    return nums;
  })();

  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => {
    return () => {
      if (imageAgressoresPreview) URL.revokeObjectURL(imageAgressoresPreview);
      if (imageHeatmapPreview) URL.revokeObjectURL(imageHeatmapPreview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Importar cards do Pipefy ────────────────────────────────────────────────

  async function importFromPipefy() {
    const urls = cardUrls.map((u) => u.trim()).filter(Boolean);
    if (urls.length === 0) {
      toast.error("Cole pelo menos uma URL de card do Pipefy.");
      return;
    }
    setLoadingImport(true);
    try {
      const results: { success: boolean; data?: { nomeAgressor: string; observacao: string }; error?: string }[] = [];
      for (const url of urls) {
        const json = await fetch("/api/resumo-tratativa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cardUrl: url, pipefyToken: pipefyToken.trim() || undefined }),
        }).then((r) => r.json());
        results.push(json);
        if (urls.indexOf(url) < urls.length - 1) {
          await new Promise((r) => setTimeout(r, 1500));
        }
      }
      const imported: ContentionAction[] = [];
      const errorMessages: string[] = [];
      for (const json of results) {
        if (json.success) {
          imported.push({ domain: json.data!.nomeAgressor, status: json.data!.observacao });
        } else {
          errorMessages.push(json.error || "Erro desconhecido");
        }
      }
      if (imported.length > 0) {
        setContentionActions(imported);
        toast.success(`${imported.length} agressor${imported.length > 1 ? "es" : ""} importado${imported.length > 1 ? "s" : ""}!`);
      }
      if (errorMessages.length > 0) {
        toast.error(errorMessages[0], { duration: 8000, style: { maxWidth: "480px" } });
        if (errorMessages.length > 1) {
          toast.error(`+ ${errorMessages.length - 1} outro${errorMessages.length > 2 ? "s" : ""} erro${errorMessages.length > 2 ? "s" : ""}`, { duration: 8000 });
        }
      }
    } catch {
      toast.error("Erro de conexão ao importar cards.");
    } finally {
      setLoadingImport(false);
    }
  }

  // ── Analisar gráfico via IA ────────────────────────────────────────────────

  async function analyzeChart(file: File, chartType: "agressores" | "heatmap"): Promise<AnalysisOptions | null> {
    const fd = new FormData();
    fd.append("image", file);
    fd.append("chartType", chartType);
    try {
      const res = await fetch("/api/analyze-chart", { method: "POST", body: fd });
      const json = await res.json();
      if (!json.success) {
        // Mostra erro completo, com mais tempo na tela
        toast.error(json.error || "Erro ao gerar análise.", {
          duration: 8000,
          style: { maxWidth: "500px" },
        });
        console.error("Erro analyze-chart:", json);
        return null;
      }
      return json.data as AnalysisOptions;
    } catch (err) {
      console.error("Erro de rede:", err);
      toast.error("Erro de conexão ao gerar análise. Veja o console (F12).", {
        duration: 6000,
      });
      return null;
    }
  }

  async function generateMetricsAnalysis() {
    const { identificados, inativos, ocorrencias, notificados, eliminados, notificacoesEnviadas } = metrics;
    if (!identificados && !notificados && !eliminados) {
      toast.error("Preencha pelo menos Identificados, Notificados e Eliminados.");
      return;
    }
    setAnalyzingMetrics(true);
    setMetricsOptions(null);
    setMetricsAnalysis("");
    try {
      // Monta um prompt textual com os números — sem precisar de imagem
      const prompt = `Analise estes resultados de Brand Bidding dos últimos ${periodDays} dias e crie 2 textos curtos (1-2 frases cada) que destacam o bom trabalho de proteção de marca. Seja positivo e profissional. Dados: Agressores Identificados: ${identificados||"—"}, Inativos: ${inativos||"—"}, Ocorrências: ${ocorrencias||"—"}, Notificados: ${notificados||"—"}, Eliminados: ${eliminados||"—"}, Notificações Enviadas: ${notificacoesEnviadas||"—"}. Retorne JSON: {"exemplo1":"...","exemplo2":"..."}`;

      const res = await fetch("/api/analyze-chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ textPrompt: prompt, chartType: "metricas" }),
      });
      const json = await res.json();
      if (json.success) {
        setMetricsOptions(json.data);
        setMetricsAnalysis(json.data.exemplo1);
        toast.success("Análise dos Big Numbers gerada!");
      } else {
        toast.error(json.error || "Erro ao gerar análise.");
      }
    } catch {
      toast.error("Erro de conexão.");
    }
    setAnalyzingMetrics(false);
  }

  // ── Set imagem + dispara IA ─────────────────────────────────────────────

  async function setAgressoresImage(file: File) {
    if (imageAgressoresPreview) URL.revokeObjectURL(imageAgressoresPreview);
    const url = URL.createObjectURL(file);
    setImageAgressores(file);
    setImageAgressoresPreview(url);

    setAnalyzingAgressores(true);
    setAgressoresOptions(null);
    const opts = await analyzeChart(file, "agressores");
    setAnalyzingAgressores(false);
    if (opts) {
      setAgressoresOptions(opts);
      setAgressoresAnalysis(opts.exemplo1);
      toast.success("Análise gerada!");
    }
  }

  function clearAgressoresImage() {
    if (imageAgressoresPreview) URL.revokeObjectURL(imageAgressoresPreview);
    setImageAgressores(null);
    setImageAgressoresPreview("");
    setAgressoresOptions(null);
    setAgressoresAnalysis("");
  }

  async function regenerateAgressores() {
    if (!imageAgressores) return;
    setAnalyzingAgressores(true);
    const opts = await analyzeChart(imageAgressores, "agressores");
    setAnalyzingAgressores(false);
    if (opts) {
      setAgressoresOptions(opts);
      setAgressoresAnalysis(opts.exemplo1);
      toast.success("Novas análises geradas!");
    }
  }

  async function setHeatmapImage(file: File) {
    if (imageHeatmapPreview) URL.revokeObjectURL(imageHeatmapPreview);
    const url = URL.createObjectURL(file);
    setImageHeatmap(file);
    setImageHeatmapPreview(url);

    setAnalyzingHeatmap(true);
    setHeatmapOptions(null);
    const opts = await analyzeChart(file, "heatmap");
    setAnalyzingHeatmap(false);
    if (opts) {
      setHeatmapOptions(opts);
      setHeatmapAnalysis(opts.exemplo1);
      toast.success("Análise gerada!");
    }
  }

  function clearHeatmapImage() {
    if (imageHeatmapPreview) URL.revokeObjectURL(imageHeatmapPreview);
    setImageHeatmap(null);
    setImageHeatmapPreview("");
    setHeatmapOptions(null);
    setHeatmapAnalysis("");
  }

  async function regenerateHeatmap() {
    if (!imageHeatmap) return;
    setAnalyzingHeatmap(true);
    const opts = await analyzeChart(imageHeatmap, "heatmap");
    setAnalyzingHeatmap(false);
    if (opts) {
      setHeatmapOptions(opts);
      setHeatmapAnalysis(opts.exemplo1);
      toast.success("Novas análises geradas!");
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  function updateHeatmap(i: number, field: keyof HeatmapEntry, value: string) {
    setHeatmap((prev) => prev.map((item, idx) => (idx === i ? { ...item, [field]: value } : item)));
  }
  function addHeatmapEntry() { setHeatmap((prev) => [...prev, { nome: "", score: "", emoji: "" }]); }
  function removeHeatmapEntry(i: number) { setHeatmap((prev) => prev.filter((_, idx) => idx !== i)); }

  function updateContention(i: number, field: keyof ContentionAction, value: string) {
    setContentionActions((prev) => prev.map((item, idx) => (idx === i ? { ...item, [field]: value } : item)));
  }
  function addContention() { setContentionActions((prev) => [...prev, { domain: "", status: "" }]); }
  function removeContention(i: number) { setContentionActions((prev) => prev.filter((_, idx) => idx !== i)); }

  function updateStandby(i: number, field: keyof StandbyCase, value: string) {
    setStandbyCases((prev) => prev.map((item, idx) => (idx === i ? { ...item, [field]: value } : item)));
  }
  function addStandby() { setStandbyCases((prev) => [...prev, { agressor: "", status: "", nextAction: "" }]); }
  function removeStandby(i: number) { setStandbyCases((prev) => prev.filter((_, idx) => idx !== i)); }

  async function downloadPdf() {
    setGeneratingPdf(true);
    try {
      await generateBbPdf({
        clientName, reportType, periodDays, periodLabel, metrics,
        metricsAnalysis,
        agressoresAnalysis, heatmapAnalysis,
        heatmap: heatmap.filter((h) => h.nome.trim()),
        contentionActions, standbyCases, awaitingApproval, resolved,
        imageAgressores, imageHeatmap,
        sectionsAtivas,
      });
      toast.success("PDF gerado!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar PDF.");
    } finally {
      setGeneratingPdf(false);
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // STEP 1
  // ────────────────────────────────────────────────────────────────────────

  function renderStep1() {
    return (
      <div className="space-y-5">
        {/* Identificação */}
        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-5">
          <SectionLabel number={0} title="Identificação" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-cyan-300/80 font-semibold mb-1">
                Cliente <span className="font-normal">(opcional)</span>
              </label>
              <input
                type="text" value={clientName} onChange={(e) => setClientName(e.target.value)}
                placeholder="Nome do cliente..."
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
              />
            </div>
            <div>
              <label className="block text-xs text-cyan-300/80 font-semibold mb-1">Período</label>
              <div className="flex items-center gap-2">
                <input
                  type="date" value={periodStart}
                  onChange={(e) => {
                    setPeriodStart(e.target.value);
                    // Formata label automaticamente
                    const fmt = (d: string) => {
                      if (!d) return "";
                      const [y, m, day] = d.split("-");
                      const meses = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
                      return `${day} ${meses[parseInt(m)-1]}`;
                    };
                    setPeriodLabel(`${fmt(e.target.value)}${periodEnd ? " a " + fmt(periodEnd) : ""}`);
                  }}
                  className="flex-1 rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
                />
                <span className="text-white/40 text-xs shrink-0">até</span>
                <input
                  type="date" value={periodEnd}
                  onChange={(e) => {
                    setPeriodEnd(e.target.value);
                    const fmt = (d: string) => {
                      if (!d) return "";
                      const [y, m, day] = d.split("-");
                      const meses = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
                      return `${day} ${meses[parseInt(m)-1]}`;
                    };
                    setPeriodLabel(`${periodStart ? fmt(periodStart) + " a " : ""}${fmt(e.target.value)}`);
                  }}
                  className="flex-1 rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
                />
              </div>
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-xs text-cyan-300/80 font-semibold mb-1">
              Token Pipefy <span className="font-normal text-white/40">(necessário para importar status na seção 4)</span>
            </label>
            <div className="relative">
              <input
                type={showToken ? "text" : "password"}
                value={pipefyToken}
                onChange={(e) => setPipefyToken(e.target.value)}
                placeholder="Cole seu token do Pipefy..."
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 pr-10 focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
              />
              <button
                type="button"
                onClick={() => setShowToken((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
              >
                {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-end gap-4">
            <div>
              <label className="block text-xs text-cyan-300/80 font-semibold mb-1">Tipo</label>
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
                        ? "bg-cyan-500 text-white border-cyan-500"
                        : "border-white/20 text-white/40 hover:border-cyan-400/40"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="w-28">
              <label className="block text-xs text-cyan-300/80 font-semibold mb-1">Nº de dias</label>
              <input
                type="number" min="1" value={periodDays}
                onChange={(e) => setPeriodDays(e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-1.5 text-sm text-center font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* 1. Métricas */}
        <div className={cn("rounded-xl border backdrop-blur-sm p-5 transition-opacity", sectionsAtivas.metricas ? "border-white/10 bg-white/5" : "border-white/5 bg-white/2 opacity-50")}>
          <div className="flex items-center justify-between mb-3">
            <SectionLabel number={sectionNumbers.metricas || 1} title={`Métricas Consolidadas (Últimos ${periodDays || "?"} dias)`} />
            <button onClick={() => setSectionsAtivas(p => ({ ...p, metricas: !p.metricas }))}
              className={cn("text-xs px-2.5 py-1 rounded-lg border font-medium transition-all", sectionsAtivas.metricas ? "border-cyan-400/40 text-cyan-400 bg-cyan-400/10" : "border-white/15 text-white/30 bg-white/5")}>
              {sectionsAtivas.metricas ? "✓ Ativo" : "Desativado"}
            </button>
          </div>
          {sectionsAtivas.metricas && <>
            <p className="text-xs text-white/50 mb-3 italic">
              A tabela a seguir resume os principais indicadores de Brand Bidding.
            </p>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {(
                [
                  { key: "identificados", label: "Identificados", desc: "Total de agressores encontrados" },
                  { key: "inativos", label: "Inativos", desc: "Removidos / sem atividade" },
                  { key: "ocorrencias", label: "Ocorrências", desc: "Anúncios capturados" },
                  { key: "notificados", label: "Notificados", desc: "Notificações enviadas" },
                  { key: "eliminados", label: "Eliminados", desc: "Agressores removidos com sucesso" },
                  { key: "notificacoesEnviadas", label: "Notificações Enviadas", desc: "Total de notificações" },
                ] as { key: keyof Metrics; label: string; desc: string }[]
              ).map(({ key, label, desc }) => (
                <div key={key}>
                  <label className="block text-xs text-cyan-300/80 font-semibold mb-0.5">{label}</label>
                  <p className="text-[10px] text-white/30 mb-1 italic">{desc}</p>
                  <input
                    type="number" min="0" value={metrics[key]}
                    onChange={(e) => setMetrics((prev) => ({ ...prev, [key]: e.target.value }))}
                    placeholder="—"
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm text-center font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              ))}
            </div>

            {/* Análise IA dos Big Numbers */}
            <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
                  <Sparkles size={12} /> Análise dos resultados (IA)
                </p>
                <div className="flex items-center gap-2">
                  {metricsAnalysis && (
                    <button onClick={() => { setMetricsAnalysis(""); setMetricsOptions(null); }}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1">
                      <Trash2 size={11} /> Excluir análise
                    </button>
                  )}
                  <button onClick={generateMetricsAnalysis} disabled={analyzingMetrics}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-cyan-500 text-white hover:bg-cyan-400 transition-all disabled:opacity-40">
                    {analyzingMetrics ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                    {analyzingMetrics ? "Gerando..." : "Gerar análise"}
                  </button>
                </div>
              </div>
              {analyzingMetrics && (
                <div className="flex items-center gap-2 text-xs text-white/50 italic">
                  <Loader2 size={12} className="animate-spin" /> Analisando métricas...
                </div>
              )}
              {metricsAnalysis && !analyzingMetrics && (
                <>
                  <textarea value={metricsAnalysis} onChange={(e) => setMetricsAnalysis(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-gray-200 bg-white text-gray-900 px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500/30 mb-2"
                  />
                  {metricsOptions && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-cyan-400 hover:text-cyan-300 font-medium">
                        Ver outra opção de análise
                      </summary>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {(["exemplo1", "exemplo2"] as const).map((k, i) => (
                          <button key={k} onClick={() => setMetricsAnalysis(metricsOptions[k])}
                            className={cn("text-left p-2 rounded-lg border transition",
                              metricsAnalysis.trim() === metricsOptions[k].trim()
                                ? "border-cyan-400 bg-cyan-400/10" : "border-white/15 hover:border-cyan-400/40")}>
                            <span className="font-bold text-cyan-400 text-[10px] uppercase">Opção {i + 1}</span>
                            <p className="text-white/70 text-[10px] mt-1 line-clamp-3">{metricsOptions[k]}</p>
                          </button>
                        ))}
                      </div>
                    </details>
                  )}
                </>
              )}
              {!metricsAnalysis && !analyzingMetrics && (
                <p className="text-xs text-white/30 italic">
                  Preencha as métricas acima e clique em "Gerar análise" para criar um texto que destaca os resultados.
                </p>
              )}
            </div>
          </>}
        </div>

        {/* 2. Agressores */}
        <div className={cn("rounded-xl border backdrop-blur-sm p-5 transition-opacity", sectionsAtivas.agressores ? "border-white/10 bg-white/5" : "border-white/5 bg-white/2 opacity-50")}>
          <div className="flex items-center justify-between mb-3">
            <SectionLabel number={sectionNumbers.agressores || 2} title="Agressores Identificados" />
            <button onClick={() => setSectionsAtivas(p => ({ ...p, agressores: !p.agressores }))}
              className={cn("text-xs px-2.5 py-1 rounded-lg border font-medium transition-all", sectionsAtivas.agressores ? "border-cyan-400/40 text-cyan-400 bg-cyan-400/10" : "border-white/15 text-white/30 bg-white/5")}>
              {sectionsAtivas.agressores ? "✓ Ativo" : "Desativado"}
            </button>
          </div>
          {sectionsAtivas.agressores && <ChartSection
            slot="agressores"
            uploadLabel="Print do gráfico de agressores"
            preview={imageAgressoresPreview}
            analysisText={agressoresAnalysis}
            options={agressoresOptions}
            loading={analyzingAgressores}
            onFile={setAgressoresImage}
            onClear={clearAgressoresImage}
            onSelectAnalysis={setAgressoresAnalysis}
            onEditAnalysis={setAgressoresAnalysis}
            onRegenerate={regenerateAgressores}
          />}
        </div>

        {/* 3. Heatmap */}
        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <SectionLabel number={sectionNumbers.heatmap || 3} title="Análise de Ofensores (Heatmap)" />
            <button onClick={() => setSectionsAtivas(p => ({ ...p, heatmap: !p.heatmap }))}
              className={cn("text-xs px-2.5 py-1 rounded-lg border font-medium transition-all", sectionsAtivas.heatmap ? "border-cyan-400/40 text-cyan-400 bg-cyan-400/10" : "border-white/15 text-white/30 bg-white/5")}>
              {sectionsAtivas.heatmap ? "✓ Ativo" : "Desativado"}
            </button>
          </div>
          <ChartSection
            slot="heatmap"
            uploadLabel="Print do heatmap"
            preview={imageHeatmapPreview}
            analysisText={heatmapAnalysis}
            options={heatmapOptions}
            loading={analyzingHeatmap}
            onFile={setHeatmapImage}
            onClear={clearHeatmapImage}
            onSelectAnalysis={setHeatmapAnalysis}
            onEditAnalysis={setHeatmapAnalysis}
            onRegenerate={regenerateHeatmap}
          />

        </div>

        <div className="flex justify-end pt-1">
          <button
            onClick={() => setStep(2)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:opacity-90 transition-all shadow-sm"
          >
            Próximo<ChevronRight size={15} />
          </button>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────
  // STEP 2
  // ────────────────────────────────────────────────────────────────────────

  function renderStep2() {
    return (
      <div className="space-y-5">
        {/* 4. Contenção */}
        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <SectionLabel number={sectionNumbers.contencao || 4} title="Status das Ações de Contenção" />
            <button onClick={() => setSectionsAtivas(p => ({ ...p, contencao: !p.contencao }))}
              className={cn("text-xs px-2.5 py-1 rounded-lg border font-medium transition-all", sectionsAtivas.contencao ? "border-cyan-400/40 text-cyan-400 bg-cyan-400/10" : "border-white/15 text-white/30 bg-white/5")}>
              {sectionsAtivas.contencao ? "✓ Ativo" : "Desativado"}
            </button>
          </div>
          {/* Import do Pipefy */}
          <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Link size={13} className="text-cyan-400" />
              <span className="text-xs font-semibold text-cyan-400">Importar do Pipefy</span>
            </div>
            <div className="space-y-2 mb-3">
              {cardUrls.map((url, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setCardUrls((prev) => prev.map((u, j) => j === i ? e.target.value : u))}
                    placeholder={`URL do card ${i + 1} (ex: app.pipefy.com/open-cards/123456)`}
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
                  />
                  {cardUrls.length > 1 && (
                    <button
                      onClick={() => setCardUrls((prev) => prev.filter((_, j) => j !== i))}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 border border-white/10 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCardUrls((prev) => [...prev, ""])}
                disabled={cardUrls.length >= 8}
                className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-medium transition-colors disabled:opacity-40"
              >
                <Plus size={12} />
                Adicionar card
              </button>
              <button
                onClick={importFromPipefy}
                disabled={loadingImport}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-500 text-white hover:bg-cyan-400 transition-all disabled:opacity-60"
              >
                {loadingImport ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                {loadingImport ? "Gerando..." : "Gerar status"}
              </button>
            </div>
          </div>

          <p className="text-xs text-white/50 mb-3 italic">
            Detalhe do andamento das principais tratativas com agressores:
          </p>
          <div className="space-y-3">
            {contentionActions.map((item, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text" value={item.domain}
                  onChange={(e) => updateContention(i, "domain", e.target.value)}
                  placeholder="dominio.com.br"
                  className="w-44 shrink-0 rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <textarea
                  value={item.status}
                  onChange={(e) => updateContention(i, "status", e.target.value)}
                  placeholder="Descreva o status atual..."
                  rows={3}
                  className="flex-1 rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                />
                {contentionActions.length > 1 && (
                  <button
                    onClick={() => removeContention(i)}
                    className="w-9 h-9 flex items-center justify-center rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 border border-white/10 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
            <button onClick={addContention} className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
              <Plus size={14} />Adicionar agressor
            </button>
          </div>
        </div>

        {/* 5. Standby - vem ANTES de Aprovação/Resolvidos, conforme modelo */}
        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <SectionLabel number={sectionNumbers.standby || 5} title="Casos em Standby e em Notificação Extrajudicial" />
            <button onClick={() => setSectionsAtivas(p => ({ ...p, standby: !p.standby }))}
              className={cn("text-xs px-2.5 py-1 rounded-lg border font-medium transition-all", sectionsAtivas.standby ? "border-cyan-400/40 text-cyan-400 bg-cyan-400/10" : "border-white/15 text-white/30 bg-white/5")}>
              {sectionsAtivas.standby ? "✓ Ativo" : "Desativado"}
            </button>
          </div>
          <p className="text-xs text-white/50 mb-3 italic">
            Os seguintes casos estão em standby ou em processo de notificação extrajudicial, após esgotamento das tentativas de contato direto:
          </p>
          {standbyCases.length === 0 && (
            <p className="text-xs text-white/50 italic mb-3">Nenhum caso no período.</p>
          )}
          <div className="space-y-3">
            {standbyCases.map((item, i) => (
              <div key={i} className="grid grid-cols-3 gap-2">
                <input
                  type="text" value={item.agressor}
                  onChange={(e) => updateStandby(i, "agressor", e.target.value)}
                  placeholder="dominio.com.br"
                  className="rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <input
                  type="text" value={item.status}
                  onChange={(e) => updateStandby(i, "status", e.target.value)}
                  placeholder="Status atual..."
                  className="rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <div className="flex gap-2">
                  <input
                    type="text" value={item.nextAction}
                    onChange={(e) => updateStandby(i, "nextAction", e.target.value)}
                    placeholder="Próxima ação..."
                    className="flex-1 rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <button
                    onClick={() => removeStandby(i)}
                    className="w-9 h-9 flex items-center justify-center rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 border border-white/10 transition-colors shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            <button onClick={addStandby} className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
              <Plus size={14} />Adicionar caso
            </button>
          </div>
        </div>

        {/* 6. Aguardando aprovação */}
        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <SectionLabel number={sectionNumbers.aprovacao || 6} title="Agressores Aguardando Aprovação" />
            <button onClick={() => setSectionsAtivas(p => ({ ...p, aprovacao: !p.aprovacao }))}
              className={cn("text-xs px-2.5 py-1 rounded-lg border font-medium transition-all", sectionsAtivas.aprovacao ? "border-cyan-400/40 text-cyan-400 bg-cyan-400/10" : "border-white/15 text-white/30 bg-white/5")}>
              {sectionsAtivas.aprovacao ? "✓ Ativo" : "Desativado"}
            </button>
          </div>
          <p className="text-xs text-white/50 mb-2 italic">
            A lista abaixo inclui os agressores recém-identificados que aguardam aprovação para o início das tratativas.
          </p>
          <p className="text-xs text-white/50 mb-2">Um domínio por linha.</p>
          <textarea
            value={awaitingApproval} onChange={(e) => setAwaitingApproval(e.target.value)}
            rows={5}
            placeholder={"concorrente1.com.br\nconcorrente2.com.br"}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
          />
        </div>

        {/* 7. Resolvidos - último, conforme modelo */}
        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <SectionLabel number={sectionNumbers.resolvidos || 7} title="Agressores Resolvidos (Sucesso)" />
            <button onClick={() => setSectionsAtivas(p => ({ ...p, resolvidos: !p.resolvidos }))}
              className={cn("text-xs px-2.5 py-1 rounded-lg border font-medium transition-all", sectionsAtivas.resolvidos ? "border-cyan-400/40 text-cyan-400 bg-cyan-400/10" : "border-white/15 text-white/30 bg-white/5")}>
              {sectionsAtivas.resolvidos ? "✓ Ativo" : "Desativado"}
            </button>
          </div>
          <p className="text-xs text-white/50 mb-2 italic">
            Os seguintes agressores tiveram suas atividades contidas com sucesso nos últimos dias:
          </p>
          <p className="text-xs text-white/50 mb-2">Um domínio por linha.</p>
          <textarea
            value={resolved} onChange={(e) => setResolved(e.target.value)}
            rows={5}
            placeholder={"sucesso1.com.br\nsucesso2.com.br"}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
          />
        </div>

        <div className="flex justify-between pt-1">
          <button
            onClick={() => setStep(1)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white hover:bg-white/10 transition-all"
          >
            <ChevronLeft size={15} />Voltar
          </button>
          <button
            onClick={() => setStep(3)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:opacity-90 transition-all shadow-sm"
          >
            Ver Preview<Eye size={15} />
          </button>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────
  // STEP 3 - PREVIEW (formato do PDF + botões de regenerar)
  // ────────────────────────────────────────────────────────────────────────

  function renderStep3() {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between px-6 pt-6">
          <div>
            <h3 className="font-semibold text-white">Preview do Relatório</h3>
            <p className="text-xs text-white/50 mt-0.5">
              Revise o conteúdo. Use os botões "Regenerar análise" se quiser pedir uma nova versão da IA.
            </p>
          </div>
          <button
            onClick={downloadPdf}
            disabled={generatingPdf}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:opacity-90 transition-all shadow-sm disabled:opacity-60"
          >
            {generatingPdf ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
            {generatingPdf ? "Gerando..." : "Baixar PDF"}
          </button>
        </div>

        {/* Documento — fundo branco limpo */}
        <div className="rounded-xl border border-white/10 overflow-hidden mx-0">
          {/* Header Branddi */}
          <div style={{ background: "linear-gradient(135deg, #0d3349 0%, #0a4d5c 100%)", padding: "24px 32px" }}>
            <div className="flex items-center gap-2 mb-2">
              <Shield size={14} className="text-white/70" />
              <span style={{ fontFamily:"Inter,sans-serif", fontSize:"10px", fontWeight:"600", color:"rgba(255,255,255,0.7)", textTransform:"uppercase", letterSpacing:"0.1em" }}>Branddi Monitor</span>
            </div>
            <h2 style={{ fontFamily:"Inter,sans-serif", fontSize:"22px", fontWeight:"700", color:"#ffffff", margin:0 }}>Relatório {reportType} de Brand Bidding</h2>
            {clientName && <p style={{ fontFamily:"Inter,sans-serif", fontSize:"12px", color:"rgba(255,255,255,0.8)", margin:"4px 0 0" }}>{clientName}</p>}
            {periodLabel && <p style={{ fontFamily:"Inter,sans-serif", fontSize:"11px", color:"rgba(255,255,255,0.6)", margin:"2px 0 0" }}>Período: {periodLabel}</p>}
          </div>

          {/* Corpo do documento — branco, scroll */}
          <div style={{ background:"#ffffff", maxHeight:"820px", overflowY:"auto", padding:"0" }}>

            {/* Introdução */}
            <div style={{ padding:"24px 32px 0" }}>
              <p style={{ fontFamily:"Inter,sans-serif", fontSize:"11px", fontWeight:"400", color:"#000000", lineHeight:"1.7", margin:0 }}>
                Este documento apresenta a consolidação {reportType === "Semanal" ? "semanal" : "quinzenal"} dos resultados e o status das ações de monitoramento e contenção de Brand Bidding, garantindo a proteção da sua marca nos canais de busca.
              </p>
            </div>

            {/* 1. Métricas */}
            {sectionsAtivas.metricas && (
              <div style={{ padding:"20px 32px 0" }}>
                <h2 style={{ fontFamily:"Inter,sans-serif", fontSize:"16px", fontWeight:"700", color:"#000000", margin:"0 0 4px" }}>
                  {previewNumbers.metricas}. Métricas Consolidadas (Últimos {periodDays || "?"} dias)
                </h2>
                <p style={{ fontFamily:"Inter,sans-serif", fontSize:"11px", fontWeight:"400", color:"#000000", margin:"0 0 12px" }}>
                  A tabela a seguir resume os principais indicadores de Brand Bidding da última semana.
                </p>
                {/* Tabela de métricas */}
                <table style={{ width:"100%", borderCollapse:"collapse", marginBottom: metricsAnalysis ? "10px" : "0" }}>
                  <thead>
                    <tr style={{ background:"#0d3349" }}>
                      {["Identificados","Inativos","Ocorrências","Notificados","Eliminados","Notificações Enviadas"].map(h => (
                        <th key={h} style={{ fontFamily:"Inter,sans-serif", fontSize:"11px", fontWeight:"700", color:"#ffffff", padding:"7px 6px", textAlign:"center", border:"1px solid #1e4d6e" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {[metrics.identificados, metrics.inativos, metrics.ocorrencias, metrics.notificados, metrics.eliminados, metrics.notificacoesEnviadas].map((v, i) => (
                        <td key={i} style={{ fontFamily:"Inter,sans-serif", fontSize:"13px", fontWeight:"700", color:"#000000", padding:"8px 6px", textAlign:"center", border:"1px solid #dddddd" }}>{v || "—"}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
                {/* Análise dos big numbers */}
                {metricsAnalysis && (
                  <p style={{ fontFamily:"Inter,sans-serif", fontSize:"11px", fontWeight:"400", color:"#000000", lineHeight:"1.7", margin:"10px 0 0", padding:"10px 12px", background:"#f8f9fa", borderLeft:"3px solid #0296a6", borderRadius:"0 4px 4px 0" }}>
                    {metricsAnalysis}
                  </p>
                )}
              </div>
            )}

            {/* 2. Agressores */}
            {sectionsAtivas.agressores && (
              <div style={{ padding:"20px 32px 0" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"6px" }}>
                  <h2 style={{ fontFamily:"Inter,sans-serif", fontSize:"16px", fontWeight:"700", color:"#000000", margin:0 }}>
                    {previewNumbers.agressores}. Agressores Identificados
                  </h2>
                  {imageAgressores && (
                    <button onClick={regenerateAgressores} disabled={analyzingAgressores}
                      style={{ display:"flex", alignItems:"center", gap:"4px", fontSize:"11px", color:"#0296a6", background:"none", border:"none", cursor:"pointer" }}>
                      {analyzingAgressores ? "Gerando..." : "↻ Nova análise"}
                    </button>
                  )}
                </div>
                {analyzingAgressores ? (
                  <p style={{ fontFamily:"Inter,sans-serif", fontSize:"11px", color:"#666", fontStyle:"italic" }}>Gerando análise...</p>
                ) : (
                  <p style={{ fontFamily:"Inter,sans-serif", fontSize:"11px", fontWeight:"400", color:"#000000", lineHeight:"1.7", margin:"0 0 10px" }}>
                    {agressoresAnalysis || <span style={{ color:"#aaa", fontStyle:"italic" }}>Cole um print para gerar a análise.</span>}
                  </p>
                )}
                {agressoresOptions && !analyzingAgressores && (
                  <details style={{ marginBottom:"8px" }}>
                    <summary style={{ cursor:"pointer", fontFamily:"Inter,sans-serif", fontSize:"11px", color:"#0296a6" }}>Ver outra opção</summary>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px", marginTop:"8px" }}>
                      {(["exemplo1", "exemplo2"] as const).map((k, i) => (
                        <button key={k} onClick={() => setAgressoresAnalysis(agressoresOptions[k])}
                          style={{ textAlign:"left", padding:"8px", borderRadius:"6px", border: agressoresAnalysis.trim() === agressoresOptions[k].trim() ? "1px solid #0296a6" : "1px solid #ddd", background: agressoresAnalysis.trim() === agressoresOptions[k].trim() ? "#f0fbff" : "#fafafa", cursor:"pointer" }}>
                          <span style={{ fontFamily:"Inter,sans-serif", fontSize:"10px", fontWeight:"700", color:"#0296a6", textTransform:"uppercase" }}>Opção {i+1}</span>
                          <p style={{ fontFamily:"Inter,sans-serif", fontSize:"11px", color:"#333", margin:"4px 0 0", display:"-webkit-box", WebkitLineClamp:3, WebkitBoxOrient:"vertical", overflow:"hidden" }}>{agressoresOptions[k]}</p>
                        </button>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}
            {sectionsAtivas.agressores && imageAgressoresPreview && (
              <div style={{ width:"100%", background:"#fff", padding:"10px 0", borderTop:"1px solid #eee", borderBottom:"1px solid #eee", display:"flex", justifyContent:"center" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageAgressoresPreview} alt="" style={{ maxWidth:"100%", height:"auto", display:"block" }} />
              </div>
            )}

            {/* 3. Heatmap */}
            {sectionsAtivas.heatmap && (
              <div style={{ padding:"20px 32px 0" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"6px" }}>
                  <h2 style={{ fontFamily:"Inter,sans-serif", fontSize:"16px", fontWeight:"700", color:"#000000", margin:0 }}>
                    {previewNumbers.heatmap}. Análise de Ofensores (Heatmap)
                  </h2>
                  {imageHeatmap && (
                    <button onClick={regenerateHeatmap} disabled={analyzingHeatmap}
                      style={{ fontSize:"11px", color:"#0296a6", background:"none", border:"none", cursor:"pointer" }}>
                      {analyzingHeatmap ? "Gerando..." : "↻ Nova análise"}
                    </button>
                  )}
                </div>
                {analyzingHeatmap ? (
                  <p style={{ fontFamily:"Inter,sans-serif", fontSize:"11px", color:"#666", fontStyle:"italic" }}>Gerando análise...</p>
                ) : (
                  <p style={{ fontFamily:"Inter,sans-serif", fontSize:"11px", fontWeight:"400", color:"#000000", lineHeight:"1.7", margin:"0 0 10px" }}>
                    {heatmapAnalysis || <span style={{ color:"#aaa", fontStyle:"italic" }}>Cole um print do heatmap para gerar a análise.</span>}
                  </p>
                )}
                {heatmapOptions && !analyzingHeatmap && (
                  <details style={{ marginBottom:"8px" }}>
                    <summary style={{ cursor:"pointer", fontFamily:"Inter,sans-serif", fontSize:"11px", color:"#0296a6" }}>Ver outra opção</summary>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px", marginTop:"8px" }}>
                      {(["exemplo1", "exemplo2"] as const).map((k, i) => (
                        <button key={k} onClick={() => setHeatmapAnalysis(heatmapOptions[k])}
                          style={{ textAlign:"left", padding:"8px", borderRadius:"6px", border: heatmapAnalysis.trim() === heatmapOptions[k].trim() ? "1px solid #0296a6" : "1px solid #ddd", background: heatmapAnalysis.trim() === heatmapOptions[k].trim() ? "#f0fbff" : "#fafafa", cursor:"pointer" }}>
                          <span style={{ fontFamily:"Inter,sans-serif", fontSize:"10px", fontWeight:"700", color:"#0296a6", textTransform:"uppercase" }}>Opção {i+1}</span>
                          <p style={{ fontFamily:"Inter,sans-serif", fontSize:"11px", color:"#333", margin:"4px 0 0", display:"-webkit-box", WebkitLineClamp:3, WebkitBoxOrient:"vertical", overflow:"hidden" }}>{heatmapOptions[k]}</p>
                        </button>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}
            {imageHeatmapPreview && sectionsAtivas.heatmap && (
              <div style={{ width:"100%", background:"#fff", padding:"10px 0", borderTop:"1px solid #eee", borderBottom:"1px solid #eee", display:"flex", justifyContent:"center" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageHeatmapPreview} alt="" style={{ maxWidth:"100%", height:"auto", display:"block" }} />
              </div>
            )}

            {/* 4. Contenção */}
            {sectionsAtivas.contencao && contentionActions.some(a => a.domain.trim()) && (
              <div style={{ padding:"20px 32px 0" }}>
                <h2 style={{ fontFamily:"Inter,sans-serif", fontSize:"16px", fontWeight:"700", color:"#000000", margin:"0 0 4px" }}>
                  {previewNumbers.contencao}. Status das Ações de Contenção
                </h2>
                <p style={{ fontFamily:"Inter,sans-serif", fontSize:"11px", color:"#000", margin:"0 0 10px" }}>Detalhe do andamento das principais tratativas com agressores:</p>
                <ul style={{ listStyle:"none", padding:0, margin:0, display:"flex", flexDirection:"column", gap:"5px" }}>
                  {contentionActions.filter(a => a.domain.trim()).map((a, i) => (
                    <li key={i} style={{ fontFamily:"Inter,sans-serif", fontSize:"11px", color:"#000" }}>
                      <span style={{ fontWeight:"700" }}>{a.domain}:</span>{" "}<span>{a.status}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 5. Standby */}
            {sectionsAtivas.standby && standbyCases.some(c => c.agressor.trim()) && (
              <div style={{ padding:"20px 32px 0" }}>
                <h2 style={{ fontFamily:"Inter,sans-serif", fontSize:"16px", fontWeight:"700", color:"#000000", margin:"0 0 4px" }}>
                  {previewNumbers.standby}. Casos em Standby e em Notificação Extrajudicial
                </h2>
                <p style={{ fontFamily:"Inter,sans-serif", fontSize:"11px", color:"#000", margin:"0 0 10px" }}>
                  Os seguintes casos estão em standby ou em processo de notificação extrajudicial, após esgotamento das tentativas de contato direto:
                </p>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead>
                    <tr style={{ background:"#0d3349" }}>
                      {["Agressor","Status","Próxima Ação"].map(h => (
                        <th key={h} style={{ fontFamily:"Inter,sans-serif", fontSize:"11px", fontWeight:"700", color:"#fff", padding:"6px 10px", textAlign:"center", border:"1px solid #1e4d6e" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {standbyCases.filter(c => c.agressor.trim()).map((c, i) => (
                      <tr key={i} style={{ background: i%2===0 ? "#f8f9fa" : "#fff" }}>
                        <td style={{ fontFamily:"Inter,sans-serif", fontSize:"11px", fontWeight:"700", color:"#000", padding:"6px 10px", textAlign:"center", border:"1px solid #ddd" }}>{c.agressor}</td>
                        <td style={{ fontFamily:"Inter,sans-serif", fontSize:"11px", fontWeight:"700", color:"#000", padding:"6px 10px", textAlign:"center", border:"1px solid #ddd" }}>{c.status}</td>
                        <td style={{ fontFamily:"Inter,sans-serif", fontSize:"11px", fontWeight:"700", color:"#000", padding:"6px 10px", textAlign:"center", border:"1px solid #ddd" }}>{c.nextAction}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 6. Aprovação */}
            {sectionsAtivas.aprovacao && awaitingApproval.trim() && (
              <div style={{ padding:"20px 32px 0" }}>
                <h2 style={{ fontFamily:"Inter,sans-serif", fontSize:"16px", fontWeight:"700", color:"#000000", margin:"0 0 4px" }}>
                  {previewNumbers.aprovacao}. Agressores Aguardando Aprovação
                </h2>
                <p style={{ fontFamily:"Inter,sans-serif", fontSize:"11px", color:"#000", margin:"0 0 8px" }}>
                  A lista abaixo inclui os agressores recém-identificados que aguardam aprovação para o início das tratativas:
                </p>
                <ul style={{ listStyle:"none", padding:0, margin:0, display:"flex", flexDirection:"column", gap:"4px" }}>
                  {awaitingApproval.split("\n").filter(Boolean).map((d, i) => (
                    <li key={i} style={{ fontFamily:"Inter,sans-serif", fontSize:"11px", color:"#000" }}>• {d.trim()}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 7. Resolvidos */}
            {sectionsAtivas.resolvidos && resolved.trim() && (
              <div style={{ padding:"20px 32px 24px" }}>
                <h2 style={{ fontFamily:"Inter,sans-serif", fontSize:"16px", fontWeight:"700", color:"#000000", margin:"0 0 4px" }}>
                  {previewNumbers.resolvidos}. Agressores Resolvidos (Sucesso)
                </h2>
                <p style={{ fontFamily:"Inter,sans-serif", fontSize:"11px", color:"#000", margin:"0 0 8px" }}>
                  Os seguintes agressores tiveram suas atividades contidas com sucesso nos últimos dias:
                </p>
                <ul style={{ listStyle:"none", padding:0, margin:0, display:"flex", flexDirection:"column", gap:"4px" }}>
                  {resolved.split("\n").filter(Boolean).map((d, i) => (
                    <li key={i} style={{ fontFamily:"Inter,sans-serif", fontSize:"11px", color:"#000" }}>• {d.trim()}</li>
                  ))}
                </ul>
              </div>
            )}

          </div>
        </div>

        <div className="flex justify-between px-6 pb-6 pt-2">
          <button
            onClick={() => setStep(2)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white hover:bg-white/10 transition-all"
          >
            <ChevronLeft size={15} />Voltar
          </button>
          <button
            onClick={downloadPdf}
            disabled={generatingPdf}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:opacity-90 transition-all shadow-sm disabled:opacity-60"
          >
            {generatingPdf ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
            {generatingPdf ? "Gerando..." : "Baixar PDF"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden" style={{ background: "linear-gradient(135deg, #061520 0%, #0a2235 40%, #0d3349 70%, #0a4d5c 100%)" }}>
      <div className="flex-1 overflow-y-auto p-6">
        {step !== 3 ? (
          <div className="max-w-3xl mx-auto">
            <StepIndicator current={step} />
            <div className="rounded-2xl border border-white/10 p-6" style={{ background: "rgba(255,255,255,0.03)" }}>
              {step === 1 && renderStep1()}
              {step === 2 && renderStep2()}
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <StepIndicator current={step} />
            <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: "rgba(255,255,255,0.03)" }}>
              {renderStep3()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
