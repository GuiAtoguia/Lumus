"use client";

import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import {
  ChevronRight, ChevronLeft, Check, Loader2, Plus, Trash2,
  Eye, Presentation, X, ImageIcon, ClipboardCopy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  generatePresentationPpt,
  PROXIMOS_PASSOS_DEFAULT,
  HEATMAP_ICON_LABEL,
  type PresentationData,
  type BigNumbers,
  type TratativaRow,
  type ResolvidoEntry,
  type ProximoPasso,
  type HeatmapRow,
  type HeatmapIcon,
  type EvolucaoRow,
  type NegativacaoRow,
  type CampanhaSlideData,
  type TrademarkEvidence,
  type MediacaoStep,
} from "@/lib/generate-pptx";
import { ChartSection, type AnalysisOptions } from "@/components/chart-section";
import { type SlideChartType } from "@/lib/apresentacao-prompt";

// ─── Steps ────────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Capa & Big Numbers" },
  { id: 2, label: "Análises (Score, Agressores, Termos)" },
  { id: 3, label: "Share & Trademark" },
  { id: 4, label: "Heatmap & Tratativas" },
  { id: 5, label: "Campanha & Saving" },
  { id: 6, label: "Resolvidos & Preview" },
];

// ─── ResolvidoCard: input de domínio + preview de logo automático ─────────────

function ResolvidoCard({
  entry, onChange, onRemove,
}: {
  entry: ResolvidoEntry;
  onChange: (updated: ResolvidoEntry) => void;
  onRemove?: () => void;
}) {
  const [logoStatus, setLogoStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Converte URL da logo para base64 para poder embedar no PPT
  async function fetchLogoAsBase64(domain: string): Promise<string | null> {
    try {
      // Usa proxy interno para evitar CORS
      const res = await fetch(`/api/logo-proxy?domain=${encodeURIComponent(domain)}`);
      if (!res.ok) return null;
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }

  function handleDomainChange(value: string) {
    onChange({ ...entry, domain: value, logoDataUrl: undefined });
    setLogoStatus("idle");
    if (timerRef.current) clearTimeout(timerRef.current);

    const cleaned = value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "");
    if (!cleaned || !cleaned.includes(".")) return;

    // Debounce 800ms para não bater na API a cada tecla
    timerRef.current = setTimeout(async () => {
      setLogoStatus("loading");
      const dataUrl = await fetchLogoAsBase64(cleaned);
      if (dataUrl) {
        onChange({ domain: value, logoDataUrl: dataUrl });
        setLogoStatus("ok");
      } else {
        setLogoStatus("error");
      }
    }, 800);
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-2 flex flex-col gap-1.5">
      {/* Preview do card como vai aparecer no PPT */}
      <div className="rounded bg-white flex items-center justify-center" style={{ height: 44 }}>
        {logoStatus === "loading" && (
          <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        )}
        {logoStatus === "ok" && entry.logoDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={entry.logoDataUrl} alt={entry.domain} className="max-h-8 max-w-full object-contain px-2" />
        )}
        {logoStatus === "error" && (
          <span className="text-[9px] text-gray-400 text-center px-1 font-mono">{entry.domain || "—"}</span>
        )}
        {logoStatus === "idle" && !entry.domain && (
          <span className="text-[9px] text-gray-300">logo aqui</span>
        )}
        {logoStatus === "idle" && entry.domain && (
          <span className="text-[9px] text-gray-400 font-mono px-1">{entry.domain}</span>
        )}
      </div>

      {/* Input + botão remover */}
      <div className="flex gap-1">
        <input
          type="text"
          value={entry.domain}
          onChange={(e) => handleDomainChange(e.target.value)}
          placeholder="dominio.com.br"
          className="flex-1 min-w-0 rounded border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 px-2 py-1 text-[10px] font-mono focus:outline-none focus:ring-1 focus:ring-cyan-400/50"
        />
        {onRemove && (
          <button onClick={onRemove}
            className="w-6 h-6 flex items-center justify-center rounded text-white/20 hover:text-red-400 border border-white/10 flex-shrink-0">
            <Trash2 size={10} />
          </button>
        )}
      </div>

      {/* Status */}
      {logoStatus === "ok" && (
        <p className="text-[9px] text-green-400 text-center">✓ Logo encontrada</p>
      )}
      {logoStatus === "error" && (
        <p className="text-[9px] text-orange-400 text-center">Domínio no slide</p>
      )}
    </div>
  );
}

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-6 flex-wrap">
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
            <span className={cn("text-[10px] font-medium whitespace-nowrap max-w-[100px] text-center", current === step.id ? "text-primary" : "text-muted-foreground")}>
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={cn("h-0.5 w-8 mx-1 mt-[-14px] transition-all", current > step.id ? "bg-primary" : "bg-border")} />
          )}
        </div>
      ))}
    </div>
  );
}

function SectionLabel({ number, title }: { number: number | string; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold flex items-center justify-center shrink-0">
        {number}
      </div>
      <h3 className="font-semibold text-xs text-white">{title}</h3>
    </div>
  );
}

// Hook customizado pra gerenciar análise de gráfico (image + analysis + opts + sidenote opcional)
function useChart() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [opts, setOpts] = useState<AnalysisOptions | null>(null);
  const [loading, setLoading] = useState(false);
  return { file, setFile, preview, setPreview, analysis, setAnalysis, opts, setOpts, loading, setLoading };
}

const HEATMAP_ICONS: HeatmapIcon[] = ["nenhum", "sucesso", "whitelist", "tratativa", "parceiro"];

function emptyTrademarkEvidence(): TrademarkEvidence {
  return { caption: "", imageDataUrl: null };
}

function emptyHeatmapRow(): HeatmapRow {
  return { icon: "nenhum", domain: "" };
}

function emptyEvolucaoRow(): EvolucaoRow {
  return { domain: "", mes1: "", mes2: "", mes3: "" };
}

function emptyNegRow(): NegativacaoRow {
  return { agressor: "", data: "", observacao: "" };
}

function emptyCampanha(): CampanhaSlideData {
  return {
    keywordIs: "", keywordContains: "", inicioAtuacao: "",
    imageDataUrlIs: null, imageDataUrlContains: null, analysis: "",
  };
}

function emptyBigNumbers(): BigNumbers {
  return {
    identificados: "", inativos: "", ocorrencias: "",
    notificados: "", resolvidos: "", notificacoesEnviadas: "",
  };
}

// ─── SimpleImageZone: zona de upload/paste sem análise de IA ─────────────────

function SimpleImageZone({
  label,
  preview,
  enabled = true,
  onToggle,
  onFile,
  onClear,
}: {
  label: string;
  preview: string;
  enabled?: boolean;
  onToggle?: () => void;
  onFile: (file: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  function handleFile(file: File | null | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Apenas imagens (PNG, JPG, etc.)"); return; }
    onFile(file);
  }

  useEffect(() => {
    if (!isFocused) return;
    function onPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) { e.preventDefault(); handleFile(file); toast.success("Imagem colada!"); return; }
        }
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-white/50">{label}</p>
        {onToggle && (
          <button type="button" onClick={onToggle}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all",
              enabled
                ? "bg-cyan-500/20 border-cyan-400/40 text-cyan-300 hover:bg-cyan-500/30"
                : "bg-white/5 border-white/10 text-white/25 hover:border-white/20"
            )}>
            <div className={cn("w-1.5 h-1.5 rounded-full transition-all", enabled ? "bg-cyan-400" : "bg-white/20")} />
            {enabled ? "Incluir no PPT" : "Não incluir"}
          </button>
        )}
      </div>
      <div className={cn("transition-all", !enabled && "opacity-30 pointer-events-none select-none")}>
        <div
          ref={dropRef}
          tabIndex={0}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onClick={() => { setIsFocused(true); if (!preview) inputRef.current?.click(); }}
          onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
          onDragOver={(e) => e.preventDefault()}
          className={cn(
            "relative rounded-xl border-2 transition-all overflow-hidden outline-none",
            preview
              ? "border-cyan-400/50 bg-[#0a2235] cursor-default"
              : "border-dashed border-white/20 hover:border-cyan-400/50 hover:bg-cyan-500/5 cursor-pointer",
            isFocused && !preview && "ring-2 ring-cyan-400/20 border-cyan-400/60 bg-cyan-500/5"
          )}
        >
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
          {preview ? (
            <>
              <div className="w-full p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt={label} className="w-full h-auto object-contain rounded-lg" style={{ display: "block" }} />
              </div>
              <button type="button" onClick={(e) => { e.stopPropagation(); onClear(); }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-500/80 transition-colors"
                title="Remover imagem">
                <X size={12} />
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-8">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                <ImageIcon size={18} className="text-white/30" />
              </div>
              <p className="text-sm font-medium text-white/50">Clique, arraste ou cole (Ctrl+V)</p>
              <p className="text-[11px] text-white/25 flex items-center gap-1">
                <ClipboardCopy size={10} />Cole um print da área de transferência
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

export function ApresentacaoMensalClient() {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [generating, setGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // CAPA
  const [clientName, setClientName] = useState("");
  const [monthYear, setMonthYear] = useState("");

  // BIG NUMBERS - Total
  const [bigNumbersTotal, setBigNumbersTotal] = useState<BigNumbers>(emptyBigNumbers());
  const [bigNumbersTotalAnalysis, setBigNumbersTotalAnalysis] = useState("");
  const [economiaTotal, setEconomiaTotal] = useState("");

  // BIG NUMBERS - Mês
  const [periodoMes, setPeriodoMes] = useState("");
  const [bigNumbersMes, setBigNumbersMes] = useState<BigNumbers>(emptyBigNumbers());
  const [taxaSucessoMes, setTaxaSucessoMes] = useState("");
  const [economiaMes, setEconomiaMes] = useState("");

  // GRÁFICOS
  const branddiScore = useChart();
  const [bsSideNote, setBsSideNote] = useState("");

  const agressoresTotal = useChart();
  const [atSideNote, setAtSideNote] = useState("");

  const agressoresSemanal = useChart();
  const [asSideNote, setAsSideNote] = useState("");

  const termosComposto = useChart();
  const termoPuro = useChart();
  

  const shareKeyword = useChart();
  const shareAgressor = useChart();
  const [shareAgressorAnalysis2, setShareAgressorAnalysis2] = useState("");

  // AFILIADOS
  const afiliadosBar = useChart();

  // ANÁLISE DE BING
  const bingPizzaPlataforma = useChart();
  const bingPizzaTermos = useChart();
  const [bingAnalysisPlataforma, setBingAnalysisPlataforma] = useState("");
  const [bingAnalysisTermos, setBingAnalysisTermos] = useState("");

  // BING SHARE
  const bingShareBar = useChart();
  const [bingShareAnalysis, setBingShareAnalysis] = useState("");

  // SHARE CONCORRENTES
  const concorrentesBar = useChart();
  const concorrentesPizza = useChart();
  const [concorrentesAnalysis, setConcorrentesAnalysis] = useState("");
  const [concorrentesAnalysisPizza, setConcorrentesAnalysisPizza] = useState("");

  // SHARE WHITELIST
  const whitelistBar = useChart();
  const whitelistPizza = useChart();
  const [whitelistAnalysis, setWhitelistAnalysis] = useState("");
  const [whitelistAnalysisPizza, setWhitelistAnalysisPizza] = useState("");

  // TRADEMARK
  const [trademarkAgressores, setTrademarkAgressores] = useState("");
  const [trademarkOcorrencias, setTrademarkOcorrencias] = useState("");
  const trademarkShare = useChart();
  const [trademarkEvidences, setTrademarkEvidences] = useState<TrademarkEvidence[]>([
    emptyTrademarkEvidence(), emptyTrademarkEvidence()
  ]);

  const [trademarkAprovAgressores, setTrademarkAprovAgressores] = useState("");
  const [trademarkAprovOcorrencias, setTrademarkAprovOcorrencias] = useState("");
  const trademarkAprov = useChart();

  // HEATMAP
  const heatmap = useChart();
  const [heatmapRows, setHeatmapRows] = useState<HeatmapRow[]>([
    emptyHeatmapRow(), emptyHeatmapRow(), emptyHeatmapRow(),
  ]);

  // EVOLUÇÃO
  const [evolucaoMeses, setEvolucaoMeses] = useState<[string, string, string]>(["Janeiro", "Fevereiro", "Março"]);
  const [evolucaoRows, setEvolucaoRows] = useState<EvolucaoRow[]>([emptyEvolucaoRow()]);
  const [evolucaoAnalysis, setEvolucaoAnalysis] = useState("");

  // TRATATIVAS
  const [tratativas, setTratativas] = useState<TratativaRow[]>([
    { agressor: "", agressividade: "", termos: "", topLeilao: "—", notificacoes: "", ultimaComunicacao: "", respondeu: "—", observacao: "" },
  ]);

  const [termosAtingidosRows, setTermosAtingidosRows] = useState<{ agressor: string; termos: string }[]>([{ agressor: "", termos: "" }]);

  // PRIORIDADE
  const [prioridadeAgressor, setPrioridadeAgressor] = useState("");
  const [prioridadeTexto, setPrioridadeTexto] = useState("");
  const [prioridadeEvidenciaUrl, setPrioridadeEvidenciaUrl] = useState<string>("");
  const [prioridadeMediacaoSteps, setPrioridadeMediacaoSteps] = useState<MediacaoStep[]>([
    { text: "" }, { text: "" }, { text: "" }
  ]);

  // NEGATIVAÇÕES
  const [negativacoes, setNegativacoes] = useState<NegativacaoRow[]>([emptyNegRow()]);

  // RESOLVIDOS
  const [resolvedTitle, setResolvedTitle] = useState("");
  const [resolved, setResolved] = useState<ResolvidoEntry[]>([{ domain: "" }]);

  // CAMPANHA
  const [cpc, setCpc] = useState<CampanhaSlideData>(emptyCampanha());
  const [ctr, setCtr] = useState<CampanhaSlideData>(emptyCampanha());
  const [parcelaImpressao, setParcelaImpressao] = useState<CampanhaSlideData>(emptyCampanha());
  const [impressao1aPosicao, setImpressao1aPosicao] = useState<CampanhaSlideData>(emptyCampanha());
  const [impressaoParteSuperior, setImpressaoParteSuperior] = useState<CampanhaSlideData>(emptyCampanha());

  // Charts com IA pra campanha (2 prints por slide: É + Contém)
  const cpcChartIs = useChart();
  const cpcChartContains = useChart();
  const ctrChartIs = useChart();
  const ctrChartContains = useChart();
  const parcelaChartIs = useChart();
  const parcelaChartContains = useChart();
  const pos1ChartIs = useChart();
  const pos1ChartContains = useChart();
  const superiorChartIs = useChart();
  const superiorChartContains = useChart();
  const savingChartIs = useChart();
  const savingChartContains = useChart();

  // Análises únicas (compartilhadas) por slide de campanha
  const [cpcAnalysis, setCpcAnalysis] = useState("");
  const [ctrAnalysis, setCtrAnalysis] = useState("");
  const [parcelaAnalysis, setParcelaAnalysis] = useState("");
  const [pos1Analysis, setPos1Analysis] = useState("");
  const [superiorAnalysis, setSuperiorAnalysis] = useState("");

  // Análises COMPARATIVAS dos termos (1 por slide)
  const [termosAnalysis, setTermosAnalysis] = useState("");
  

  // SAVING
  const [saving, setSaving] = useState({
    keywordIs: "", keywordContains: "", inicioAtuacao: "",
    savingValue: "", roiValue: "",
    analysis: "",
  });

  // PRÓXIMOS PASSOS
  const [proximosPassos, setProximosPassos] = useState<ProximoPasso[]>(PROXIMOS_PASSOS_DEFAULT);

  // ── Toggles de slides (quais incluir no PPT) ──────────────────────────────
  type SlideKey =
    | "bigNumbersTotal" | "bigNumbersMes"
    | "branddiScore" | "agressoresTotal" | "agressoresSemanal"
    | "termos1" | "slideVazio"
    | "shareKeyword" | "shareAgressor"
    | "afiliados" | "analiseBing" | "bingShare"
    | "shareConcorrentes" | "shareWhitelist"
    | "trademarkEvidencia" | "trademarkAprov"
    | "heatmap" | "evolucao"
    | "tratativas" | "termosAtingidos" | "prioridade" | "negativacoes"
    | "resolvidos" | "campanha" | "saving" | "proximosPassos";

  const [slidesAtivos, setSlidesAtivos] = useState<Record<SlideKey, boolean>>({
    bigNumbersTotal: true, bigNumbersMes: true,
    branddiScore: true, agressoresTotal: true, agressoresSemanal: true,
    termos1: true, slideVazio: true,
    shareKeyword: true, shareAgressor: true,
    afiliados: true, analiseBing: true, bingShare: true,
    shareConcorrentes: true, shareWhitelist: true,
    trademarkEvidencia: true, trademarkAprov: true,
    heatmap: true, evolucao: true,
    tratativas: true, termosAtingidos: true, prioridade: true, negativacoes: true,
    resolvidos: true, campanha: true, saving: true, proximosPassos: true,
  });

  function toggleSlide(key: SlideKey) {
    setSlidesAtivos((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // ── Toggles de gráficos individuais ──────────────────────────────────────
  type ChartKey =
    | "branddiScoreChart"
    | "agressoresTotalChart" | "agressoresSemanalChart"
    | "termosCompostoChart" | "termoPuroChart"
    | "shareKeywordChart" | "shareAgressorChart"
    | "trademarkShareChart" | "trademarkAprovChart"
    | "trademarkEvid1" | "trademarkEvid2"
    | "heatmapChart"
    | "cpcChartIs" | "cpcChartContains"
    | "ctrChartIs" | "ctrChartContains"
    | "parcelaChartIs" | "parcelaChartContains"
    | "pos1ChartIs" | "pos1ChartContains"
    | "superiorChartIs" | "superiorChartContains"
    | "savingChartIs" | "savingChartContains";

  const [chartsAtivos, setChartsAtivos] = useState<Record<ChartKey, boolean>>({
    branddiScoreChart: true,
    agressoresTotalChart: true, agressoresSemanalChart: true,
    termosCompostoChart: true, termoPuroChart: true,
    shareKeywordChart: true, shareAgressorChart: true,
    trademarkShareChart: true, trademarkAprovChart: true,
    trademarkEvid1: true, trademarkEvid2: true,
    heatmapChart: true,
    cpcChartIs: true, cpcChartContains: true,
    ctrChartIs: true, ctrChartContains: true,
    parcelaChartIs: true, parcelaChartContains: true,
    pos1ChartIs: true, pos1ChartContains: true,
    superiorChartIs: true, superiorChartContains: true,
    savingChartIs: true, savingChartContains: true,
  });

  function toggleChart(key: ChartKey) {
    setChartsAtivos((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // ── Calculadora de economia (auto-puxa de Big Numbers) ──────────────────
  const [calcValor, setCalcValor] = useState("350");
  const [calcValorMes, setCalcValorMes] = useState("350");

  // Notificações vêm direto do Big Numbers (auto-preenchido)
  const calcNotif = bigNumbersTotal.notificacoesEnviadas;
  const calcNotifMes = bigNumbersMes.notificacoesEnviadas;

  const economiaCalcTotal = (() => {
    const n = parseInt(calcNotif.replace(/\D/g, "")) || 0;
    const v = parseInt(calcValor) || 0;
    return n > 0 && v > 0 ? (n * v).toLocaleString("pt-BR") : "";
  })();

  const economiaCalcMes = (() => {
    const n = parseInt(calcNotifMes.replace(/\D/g, "")) || 0;
    const v = parseInt(calcValorMes) || 0;
    return n > 0 && v > 0 ? (n * v).toLocaleString("pt-BR") : "";
  })();

  // Auto-preenche o campo "Economia total" sempre que o resultado mudar
  useEffect(() => {
    if (economiaCalcTotal) setEconomiaTotal(economiaCalcTotal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [economiaCalcTotal]);

  useEffect(() => {
    if (economiaCalcMes) setEconomiaMes(economiaCalcMes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [economiaCalcMes]);

  useEffect(() => {
    return () => {
      [branddiScore.preview, agressoresTotal.preview, agressoresSemanal.preview,
       termosComposto.preview, termoPuro.preview,
       shareKeyword.preview, shareAgressor.preview,
       trademarkShare.preview, trademarkAprov.preview, heatmap.preview]
        .forEach((p) => p && URL.revokeObjectURL(p));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── IA ─────────────────────────────────────────────────────────────────────

  async function callAi(file: File, chartType: SlideChartType): Promise<AnalysisOptions | null> {
    const fd = new FormData();
    fd.append("image", file);
    fd.append("chartType", chartType);
    try {
      const res = await fetch("/api/analyze-presentation-chart", { method: "POST", body: fd });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || "Erro ao gerar análise.", { duration: 6000 });
        return null;
      }
      return json.data as AnalysisOptions;
    } catch {
      toast.error("Erro de conexão.", { duration: 5000 });
      return null;
    }
  }

  async function handleChartFile(
    file: File, chartType: SlideChartType,
    chart: ReturnType<typeof useChart>
  ) {
    if (chart.preview) URL.revokeObjectURL(chart.preview);
    const url = URL.createObjectURL(file);
    chart.setFile(file);
    chart.setPreview(url);
    chart.setLoading(true);
    chart.setOpts(null);
    const opts = await callAi(file, chartType);
    chart.setLoading(false);
    if (opts) {
      chart.setOpts(opts);
      chart.setAnalysis(opts.exemplo1);
      toast.success("Análise gerada!");
    }
  }

  async function handleRegenerate(chartType: SlideChartType, chart: ReturnType<typeof useChart>) {
    if (!chart.file) return;
    chart.setLoading(true);
    const opts = await callAi(chart.file, chartType);
    chart.setLoading(false);
    if (opts) {
      chart.setOpts(opts);
      chart.setAnalysis(opts.exemplo1);
      toast.success("Novas análises geradas!");
    }
  }

  function handleClear(chart: ReturnType<typeof useChart>) {
    if (chart.preview) URL.revokeObjectURL(chart.preview);
    chart.setFile(null);
    chart.setPreview("");
    chart.setOpts(null);
    chart.setAnalysis("");
  }

  // ── Helper: cria props pra ChartSection automaticamente ────────────────────
  function chartProps(
    chart: ReturnType<typeof useChart>,
    chartType: SlideChartType,
    uploadLabel: string,
    slot: "agressores" | "heatmap" = "agressores",
    chartKey?: ChartKey
  ) {
    return {
      slot,
      uploadLabel,
      preview: chart.preview,
      analysisText: chart.analysis,
      options: chart.opts,
      loading: chart.loading,
      enabled: chartKey ? chartsAtivos[chartKey] : true,
      onToggle: chartKey ? () => toggleChart(chartKey) : undefined,
      onFile: (f: File) => handleChartFile(f, chartType, chart),
      onClear: () => handleClear(chart),
      onSelectAnalysis: chart.setAnalysis,
      onEditAnalysis: chart.setAnalysis,
      onRegenerate: () => handleRegenerate(chartType, chart),
    };
  }

  // ── Helpers de listas ──────────────────────────────────────────────────────

  function updateTrat(i: number, field: keyof TratativaRow, value: string) {
    setTratativas((prev) => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  }

  // ── fileToDataUrl (pra trademark evidence) ─────────────────────────────────
  async function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleTradEvidImage(i: number, file: File) {
    const url = await readFileAsDataUrl(file);
    setTrademarkEvidences((prev) => prev.map((e, idx) => idx === i ? { ...e, imageDataUrl: url } : e));
  }

  async function handleCampanhaImage(setter: (c: CampanhaSlideData) => void, current: CampanhaSlideData, file: File) {
    const url = await readFileAsDataUrl(file);
    setter({ ...current, imageDataUrlIs: url });
  }

  async function handleSavingTableImage(file: File) {
    const url = await readFileAsDataUrl(file);
    // tableImage removed - use savingChartIs/Contains
  }

  // ── Calculos ───────────────────────────────────────────────────────────────

  const taxaTotalCalc = (() => {
    const n = parseInt(bigNumbersTotal.notificados) || 0;
    const r = parseInt(bigNumbersTotal.resolvidos) || 0;
    return n > 0 ? Math.round((r / n) * 100) : 0;
  })();

  const taxaMesCalc = (() => {
    const n = parseInt(bigNumbersMes.notificados) || 0;
    const r = parseInt(bigNumbersMes.resolvidos) || 0;
    return n > 0 ? Math.round((r / n) * 100) : 0;
  })();

  // ── Gerar PPT ──────────────────────────────────────────────────────────────

  async function downloadPpt() {
    setGenerating(true);
    try {
      const fileToData = async (f: File | null) => f ? await readFileAsDataUrl(f) : null;
      // Helper: retorna imagem só se o gráfico estiver ativo
      const chartImg = async (f: File | null, key: ChartKey) =>
        chartsAtivos[key] ? await fileToData(f) : null;
      const chartTxt = (text: string, key: ChartKey) =>
        chartsAtivos[key] ? text : "";

      const data: PresentationData = {
        clientName, monthYear,
        bigNumbersTotal, bigNumbersTotalAnalysis, economiaTotal,
        bigNumbersMes, periodoMes, taxaSucessoMes: taxaSucessoMes || `${taxaMesCalc}%`, economiaMes,

        branddiScoreImage: await chartImg(branddiScore.file, "branddiScoreChart"),
        branddiScoreAnalysis: chartTxt(branddiScore.analysis, "branddiScoreChart"),
        branddiScoreSideNote: chartsAtivos.branddiScoreChart ? bsSideNote : "",

        agressoresTotalImage: await chartImg(agressoresTotal.file, "agressoresTotalChart"),
        agressoresTotalAnalysis: chartTxt(agressoresTotal.analysis, "agressoresTotalChart"),
        agressoresTotalSideNote: chartsAtivos.agressoresTotalChart ? atSideNote : "",

        agressoresSemanalImage: await chartImg(agressoresSemanal.file, "agressoresSemanalChart"),
        agressoresSemanalAnalysis: chartTxt(agressoresSemanal.analysis, "agressoresSemanalChart"),
        agressoresSemanalSideNote: chartsAtivos.agressoresSemanalChart ? asSideNote : "",

        termosCompostoImage: await chartImg(termosComposto.file, "termosCompostoChart"),
        termoPuroImage: await chartImg(termoPuro.file, "termoPuroChart"),
        termosAnalysis: (chartsAtivos.termosCompostoChart || chartsAtivos.termoPuroChart) ? termosAnalysis : "",

        shareKeywordImage: await chartImg(shareKeyword.file, "shareKeywordChart"),
        shareKeywordAnalysis: chartTxt(shareKeyword.analysis, "shareKeywordChart"),
        shareAgressorImage: await chartImg(shareAgressor.file, "shareAgressorChart"),
        shareAgressorAnalysis: chartTxt(shareAgressor.analysis, "shareAgressorChart"),
        shareAgressorAnalysis2: chartsAtivos.shareAgressorChart ? shareAgressorAnalysis2 : "",

        afiliadosBarImage: await fileToData(afiliadosBar.file),

        bingPizzaPlataformaImage: await fileToData(bingPizzaPlataforma.file),
        bingPizzaTermosImage: await fileToData(bingPizzaTermos.file),
        bingAnalysisPlataforma, bingAnalysisTermos,

        bingShareBarImage: await fileToData(bingShareBar.file),
        bingShareAnalysis,

        concorrentesBarImage: await fileToData(concorrentesBar.file),
        concorrentesPizzaImage: await fileToData(concorrentesPizza.file),
        concorrentesAnalysis, concorrentesAnalysisPizza,

        whitelistBarImage: await fileToData(whitelistBar.file),
        whitelistPizzaImage: await fileToData(whitelistPizza.file),
        whitelistAnalysis, whitelistAnalysisPizza,

        trademarkAgressores, trademarkOcorrencias,
        trademarkShareImage: await chartImg(trademarkShare.file, "trademarkShareChart"),
        trademarkAnalysis: chartTxt(trademarkShare.analysis, "trademarkShareChart"),
        trademarkEvidences,

        trademarkAprovAgressores, trademarkAprovOcorrencias,
        trademarkAprovImage: await chartImg(trademarkAprov.file, "trademarkAprovChart"),
        trademarkAprovAnalysis: chartTxt(trademarkAprov.analysis, "trademarkAprovChart"),

        heatmapImage: await chartImg(heatmap.file, "heatmapChart"),
        heatmapAnalysis: chartTxt(heatmap.analysis, "heatmapChart"),
        heatmapRows: heatmapRows.filter((r) => r.domain.trim()),

        evolucaoMeses,
        evolucaoRows: evolucaoRows.filter((r) => r.domain.trim()),
        evolucaoAnalysis,

        tratativas: tratativas.filter((t) => t.agressor.trim()),
        termosAtingidosRows: termosAtingidosRows.filter((r) => r.agressor.trim()),

        prioridadeAgressor, prioridadeTexto,
        prioridadeEvidenciaUrl,
        prioridadeMediacaoSteps: prioridadeMediacaoSteps.filter((s) => s.text.trim()),

        negativacoes: negativacoes.filter((n) => n.agressor.trim()),

        resolvedTitle,
        resolved: resolved.filter((r) => r.domain.trim()),

        cpc: { ...cpc, imageDataUrlIs: chartsAtivos.cpcChartIs ? await fileToData(cpcChartIs.file) : null, imageDataUrlContains: chartsAtivos.cpcChartContains ? await fileToData(cpcChartContains.file) : null, analysis: cpcAnalysis },
        ctr: { ...ctr, imageDataUrlIs: chartsAtivos.ctrChartIs ? await fileToData(ctrChartIs.file) : null, imageDataUrlContains: chartsAtivos.ctrChartContains ? await fileToData(ctrChartContains.file) : null, analysis: ctrAnalysis },
        parcelaImpressao: { ...parcelaImpressao, imageDataUrlIs: chartsAtivos.parcelaChartIs ? await fileToData(parcelaChartIs.file) : null, imageDataUrlContains: chartsAtivos.parcelaChartContains ? await fileToData(parcelaChartContains.file) : null, analysis: parcelaAnalysis },
        impressao1aPosicao: { ...impressao1aPosicao, imageDataUrlIs: chartsAtivos.pos1ChartIs ? await fileToData(pos1ChartIs.file) : null, imageDataUrlContains: chartsAtivos.pos1ChartContains ? await fileToData(pos1ChartContains.file) : null, analysis: pos1Analysis },
        impressaoParteSuperior: { ...impressaoParteSuperior, imageDataUrlIs: chartsAtivos.superiorChartIs ? await fileToData(superiorChartIs.file) : null, imageDataUrlContains: chartsAtivos.superiorChartContains ? await fileToData(superiorChartContains.file) : null, analysis: superiorAnalysis },
        saving: { ...saving, tableImageIs: chartsAtivos.savingChartIs ? await fileToData(savingChartIs.file) : null, tableImageContains: chartsAtivos.savingChartContains ? await fileToData(savingChartContains.file) : null },

        proximosPassos,
      };

      const slidesSnapshot = { ...slidesAtivos };
      console.log("[downloadPpt] slidesAtivos:", JSON.stringify(slidesSnapshot));
      await generatePresentationPpt(data, slidesSnapshot);
      toast.success("Apresentação gerada!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar apresentação.");
    } finally {
      setGenerating(false);
    }
  }

  // ── Renderização dos passos ────────────────────────────────────────────────

  function SlideToggle({ slideKey, label }: { slideKey: SlideKey; label: string }) {
    const ativo = slidesAtivos[slideKey];
    return (
      <button
        onClick={() => toggleSlide(slideKey)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
          ativo
            ? "bg-cyan-500/20 border-cyan-400/40 text-cyan-300"
            : "bg-white/5 border-white/10 text-white/30 line-through"
        )}
      >
        <div className={cn("w-2 h-2 rounded-full transition-all", ativo ? "bg-cyan-400" : "bg-white/20")} />
        {label}
      </button>
    );
  }

  function renderStep1() {
    return (
      <div className="space-y-5">
        {/* Identificação */}
        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-5">
          <SectionLabel number="1" title="Identificação (Capa)" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-white/50 mb-1">Nome do cliente</label>
              <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)}
                placeholder="Ex: PACCO"
                className="w-full rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/60" />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Mês | Ano</label>
              <input type="text" value={monthYear} onChange={(e) => setMonthYear(e.target.value)}
                placeholder="Ex: Março | 2026"
                className="w-full rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/60" />
            </div>
          </div>
        </div>

        {/* Big Numbers Total - Slide 3 */}
        <div className={cn(
          "rounded-xl border p-5 transition-all",
          slidesAtivos.bigNumbersTotal
            ? "border-white/10 bg-white/5 backdrop-blur-sm"
            : "border-white/5 bg-white/2 opacity-50"
        )}>
          <div className="flex items-center justify-between mb-3">
            <SectionLabel number="3" title="Big Numbers (Toda a parceria)" />
            <SlideToggle slideKey="bigNumbersTotal" label="Slide 3" />
          </div>

          {slidesAtivos.bigNumbersTotal && (
            <>
              <p className="text-xs text-white/40 mb-3 italic">
                Pegue do dashboard da Branddi (filtro do onboarding até hoje).
              </p>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { key: "identificados", label: "Identificados" },
                  { key: "inativos", label: "Inativos" },
                  { key: "ocorrencias", label: "Ocorrências" },
                  { key: "notificados", label: "Notificados" },
                  { key: "resolvidos", label: "Resolvidos" },
                  { key: "notificacoesEnviadas", label: "Notif. Enviadas" },
                ] as { key: keyof BigNumbers; label: string }[]).map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-xs text-white/50 mb-1">{label}</label>
                    <input type="text" value={bigNumbersTotal[key]}
                      onChange={(e) => setBigNumbersTotal((p) => ({ ...p, [key]: e.target.value }))}
                      placeholder="—"
                      className="w-full rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 px-3 py-2 text-sm text-center font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/60" />
                  </div>
                ))}
              </div>

              {/* Taxa de sucesso */}
              <div className="mt-4 rounded-lg bg-cyan-500/10 border border-cyan-400/20 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-cyan-400/70 font-semibold">Taxa de Sucesso</p>
                  <p className="text-xs text-white/40 mt-0.5">{bigNumbersTotal.resolvidos || "0"} resolvidos ÷ {bigNumbersTotal.notificados || "0"} notificados</p>
                </div>
                <p className="text-3xl font-bold text-cyan-400">{taxaTotalCalc}%</p>
              </div>

              {/* Calculadora de economia */}
              <div className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm">🧮</span>
                  <p className="text-xs font-semibold text-cyan-300">Calculadora de Economia</p>
                </div>
                <p className="text-[10px] text-white/40 mb-2 italic">
                  💡 Notificações puxadas automaticamente do Big Numbers acima. Economia total preenchida automaticamente abaixo.
                </p>
                <div className="grid grid-cols-3 gap-3 items-end">
                  <div>
                    <label className="block text-[11px] text-white/40 mb-1">Notif. enviadas (auto)</label>
                    <input type="text" value={calcNotif} readOnly
                      placeholder="—"
                      className="w-full rounded-lg border border-gray-200 bg-gray-100 text-gray-700 placeholder:text-gray-400 px-3 py-2 text-sm cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-white/40 mb-1">Valor por notif. (R$)</label>
                    <input type="number" min="300" max="1000" value={calcValor} onChange={(e) => setCalcValor(e.target.value)}
                      placeholder="350"
                      className="w-full rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/60" />
                  </div>
                  <div className="rounded-lg bg-cyan-500/15 border border-cyan-400/30 px-3 py-2 text-center">
                    <p className="text-[10px] text-cyan-400/70 uppercase tracking-wide">Resultado</p>
                    <p className="text-lg font-bold text-cyan-300">
                      {economiaCalcTotal ? `R$ ${economiaCalcTotal}` : "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Campo economia + legenda fixa */}
              <div className="mt-4">
                <label className="block text-xs text-white/50 mb-1">Economia total (R$) <span className="text-cyan-400/70">— preenchida automaticamente</span></label>
                <input type="text" value={economiaTotal} onChange={(e) => setEconomiaTotal(e.target.value)}
                  placeholder="Ex: 105.000"
                  className="w-full rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/60 mb-2" />
                <div className="rounded-lg border border-white/8 bg-white/5 px-3 py-2">
                  <p className="text-xs text-white/50 italic">
                    Legenda no slide: <span className="text-white/70 not-italic font-medium">
                      *Economia total de R${economiaTotal ? parseFloat(economiaTotal.replace(/\./g,"").replace(",",".")).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}) : "xx"} em notificações enviadas.
                    </span>
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Big Numbers Mês - Slide 4 */}
        <div className={cn(
          "rounded-xl border p-5 transition-all",
          slidesAtivos.bigNumbersMes
            ? "border-white/10 bg-white/5 backdrop-blur-sm"
            : "border-white/5 bg-white/2 opacity-50"
        )}>
          <div className="flex items-center justify-between mb-3">
            <SectionLabel number="4" title="Big Numbers (Período mensal)" />
            <SlideToggle slideKey="bigNumbersMes" label="Slide 4" />
          </div>

          {slidesAtivos.bigNumbersMes && (
            <>
              <div className="mb-3">
                <label className="block text-xs text-white/50 mb-1">Período (ex: &quot;Apenas dezembro&quot;)</label>
                <input type="text" value={periodoMes} onChange={(e) => setPeriodoMes(e.target.value)}
                  placeholder="Ex: Apenas Janeiro"
                  className="w-full rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/60" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { key: "identificados", label: "Identificados" },
                  { key: "inativos", label: "Inativos" },
                  { key: "ocorrencias", label: "Ocorrências" },
                  { key: "notificados", label: "Notificados" },
                  { key: "resolvidos", label: "Resolvidos" },
                  { key: "notificacoesEnviadas", label: "Notif. Enviadas" },
                ] as { key: keyof BigNumbers; label: string }[]).map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-xs text-white/50 mb-1">{label}</label>
                    <input type="text" value={bigNumbersMes[key]}
                      onChange={(e) => setBigNumbersMes((p) => ({ ...p, [key]: e.target.value }))}
                      placeholder="—"
                      className="w-full rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 px-3 py-2 text-sm text-center font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/60" />
                  </div>
                ))}
              </div>

              {/* Taxa de sucesso mês */}
              <div className="mt-4 rounded-lg bg-cyan-500/10 border border-cyan-400/20 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-cyan-400/70 font-semibold">Taxa de Sucesso (mês)</p>
                  <p className="text-xs text-white/40 mt-0.5">{bigNumbersMes.resolvidos || "0"} ÷ {bigNumbersMes.notificados || "0"}</p>
                </div>
                <p className="text-3xl font-bold text-cyan-400">{taxaMesCalc}%</p>
              </div>

              {/* Calculadora economia do mês */}
              <div className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm">🧮</span>
                  <p className="text-xs font-semibold text-cyan-300">Calculadora de Economia (mês)</p>
                </div>
                <p className="text-[10px] text-white/40 mb-2 italic">
                  💡 Notificações puxadas automaticamente do Big Numbers acima. Economia do mês preenchida automaticamente abaixo.
                </p>
                <div className="grid grid-cols-3 gap-3 items-end">
                  <div>
                    <label className="block text-[11px] text-white/40 mb-1">Notif. enviadas (auto)</label>
                    <input type="text" value={calcNotifMes} readOnly
                      placeholder="—"
                      className="w-full rounded-lg border border-gray-200 bg-gray-100 text-gray-700 placeholder:text-gray-400 px-3 py-2 text-sm cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-white/40 mb-1">Valor por notif. (R$)</label>
                    <input type="number" min="300" max="1000" value={calcValorMes} onChange={(e) => setCalcValorMes(e.target.value)}
                      placeholder="350"
                      className="w-full rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/60" />
                  </div>
                  <div className="rounded-lg bg-cyan-500/15 border border-cyan-400/30 px-3 py-2 text-center">
                    <p className="text-[10px] text-cyan-400/70 uppercase tracking-wide">Resultado</p>
                    <p className="text-lg font-bold text-cyan-300">
                      {economiaCalcMes ? `R$ ${economiaCalcMes}` : "—"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-xs text-white/50 mb-1">Economia do mês (R$) <span className="text-cyan-400/70">— preenchida automaticamente</span></label>
                <input type="text" value={economiaMes} onChange={(e) => setEconomiaMes(e.target.value)}
                  placeholder="Ex: 8.500"
                  className="w-full rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/60 mb-2" />
                <div className="rounded-lg border border-white/8 bg-white/5 px-3 py-2">
                  <p className="text-xs text-white/50 italic">
                    Legenda no slide: <span className="text-white/70 not-italic font-medium">
                      *Economia total de R${economiaMes ? parseFloat(economiaMes.replace(/\./g,"").replace(",",".")).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}) : "xx"} em notificações enviadas.
                    </span>
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end pt-1">
          <button onClick={() => setStep(2)} disabled={!clientName.trim() || !monthYear.trim()}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-cyan-500 text-white hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed">
            Próximo<ChevronRight size={15} />
          </button>
        </div>
      </div>
    );
  }

  function renderStep2() {
    return (
      <div className="space-y-5">
        {/* Branddi Score */}
        <div className={cn("rounded-xl border backdrop-blur-sm p-5", slidesAtivos.branddiScore ? "border-white/10 bg-white/5" : "border-white/5 bg-white/2 opacity-50")}>
          <div className="flex items-center justify-between mb-3">
            <SectionLabel number="5" title="Branddi Score" />
            <SlideToggle slideKey="branddiScore" label="Slide 5" />
          </div>
          {slidesAtivos.branddiScore && <>
            <ChartSection {...chartProps(branddiScore, "branddi_score", "Print do gráfico Branddi Score", "agressores", "branddiScoreChart")} />
            <div className="mt-3">
              <label className="block text-xs text-white/50 mb-1">📌 Detalhe lateral em azul (opcional)</label>
              <input type="text" value={bsSideNote} onChange={(e) => setBsSideNote(e.target.value)}
                placeholder="Ex: Estabilização no patamar mais alto..."
                className="w-full rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/60" />
            </div>
          </>}
        </div>

        {/* Agressores Total */}
        <div className={cn("rounded-xl border backdrop-blur-sm p-5", slidesAtivos.agressoresTotal ? "border-white/10 bg-white/5" : "border-white/5 bg-white/2 opacity-50")}>
          <div className="flex items-center justify-between mb-3">
            <SectionLabel number="6" title="Agressores - Visão Total" />
            <SlideToggle slideKey="agressoresTotal" label="Slide 6" />
          </div>
          {slidesAtivos.agressoresTotal && <>
            <ChartSection {...chartProps(agressoresTotal, "agressores_total", "Print agressores total", "agressores", "agressoresTotalChart")} />
            <div className="mt-3">
              <label className="block text-xs text-white/50 mb-1">📌 Detalhe lateral em azul</label>
              <input type="text" value={atSideNote} onChange={(e) => setAtSideNote(e.target.value)}
                placeholder="Ex: Aumento em relação ao último mês"
                className="w-full rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/60" />
            </div>
          </>}
        </div>

        {/* Agressores Semanal */}
        <div className={cn("rounded-xl border backdrop-blur-sm p-5", slidesAtivos.agressoresSemanal ? "border-white/10 bg-white/5" : "border-white/5 bg-white/2 opacity-50")}>
          <div className="flex items-center justify-between mb-3">
            <SectionLabel number="7" title="Agressores - Semanal (Últimos 2 meses)" />
            <SlideToggle slideKey="agressoresSemanal" label="Slide 7" />
          </div>
          {slidesAtivos.agressoresSemanal && <>
            <ChartSection {...chartProps(agressoresSemanal, "agressores_semanal", "Print agressores semanal", "agressores", "agressoresSemanalChart")} />
            <div className="mt-3">
              <label className="block text-xs text-white/50 mb-1">📌 Detalhe lateral em azul</label>
              <input type="text" value={asSideNote} onChange={(e) => setAsSideNote(e.target.value)}
                placeholder="Ex: Aumento em relação ao último mês (Novos Termos)"
                className="w-full rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/60" />
            </div>
          </>}
        </div>

        {/* Análise de Termos - Slide 8 */}
        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <SectionLabel number="8" title="Análise de Termos - V1" />
            <SlideToggle slideKey="termos1" label="Slide 8" />
          </div>
          {slidesAtivos.termos1 && (
            <>
              <p className="text-xs text-white/40 mb-3 italic">2 gráficos lado a lado. A análise comparativa aparece embaixo dos dois.</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-cyan-300 mb-2">Todos os termos</p>
                  <ChartSection {...chartProps(termosComposto, "termos_composto", "Print termos compostos", "agressores", "termosCompostoChart")} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-cyan-300 mb-2">Termo puro - Página 1</p>
                  <ChartSection {...chartProps(termoPuro, "termos_puro", "Print termo puro", "agressores", "termoPuroChart")} />
                </div>
              </div>
              {/* Análise comparativa única */}
              <div className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-3">
                <p className="text-[11px] font-semibold text-cyan-300 mb-2 flex items-center gap-1.5">
                  <span>✨</span> Análise comparativa (fala dos dois gráficos juntos)
                </p>
                <textarea
                  value={termosAnalysis}
                  onChange={(e) => setTermosAnalysis(e.target.value)}
                  rows={3}
                  placeholder="Ex: O total de agressores teve queda significativa em março, reduzindo de 35 para 11 (68,6%). Em abril o aumento para 22 demonstra a agilidade da Branddi em capturar novas ameaças..."
                  className="w-full rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                />
              </div>
            </>
          )}
        </div>


        {/* Slide Vazio */}

        <div className="flex justify-between pt-1">
          <button onClick={() => setStep(1)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white hover:bg-white/10 transition-all">
            <ChevronLeft size={15} />Voltar
          </button>
          <button onClick={() => setStep(3)} className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-cyan-500 text-white hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/20">
            Próximo<ChevronRight size={15} />
          </button>
        </div>
      </div>
    );
  }

  function renderStep3() {
    return (
      <div className="space-y-5">
        {/* Share Keyword */}
        <div className={cn("rounded-xl border backdrop-blur-sm p-5", slidesAtivos.shareKeyword ? "border-white/10 bg-white/5" : "border-white/5 bg-white/2 opacity-50")}>
          <div className="flex items-center justify-between mb-3">
            <SectionLabel number="11" title="Share de Ocorrências - por keyword" />
            <SlideToggle slideKey="shareKeyword" label="Slide 11" />
          </div>
          {slidesAtivos.shareKeyword && (
            <ChartSection {...chartProps(shareKeyword, "share_keyword", "Print share por keyword", "agressores", "shareKeywordChart")} />
          )}
        </div>

        {/* Share Agressor */}
        <div className={cn("rounded-xl border backdrop-blur-sm p-5", slidesAtivos.shareAgressor ? "border-white/10 bg-white/5" : "border-white/5 bg-white/2 opacity-50")}>
          <div className="flex items-center justify-between mb-3">
            <SectionLabel number="12" title="Share de Ocorrências - por agressor" />
            <SlideToggle slideKey="shareAgressor" label="Slide 12" />
          </div>
          {slidesAtivos.shareAgressor && <>
            <ChartSection {...chartProps(shareAgressor, "share_agressor", "Print share por agressor", "agressores", "shareAgressorChart")} />
            <div className="mt-3">
              <label className="block text-xs text-white/50 mb-1">Análise complementar (2ª linha azul)</label>
              <input type="text" value={shareAgressorAnalysis2} onChange={(e) => setShareAgressorAnalysis2(e.target.value)}
                placeholder="Ex: Ameaças fraudulentas concentram 71,4%..."
                className="w-full rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/60" />
            </div>
          </>}
        </div>

        {/* Afiliados */}
        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <SectionLabel number="12a" title="Afiliados" />
            <SlideToggle slideKey="afiliados" label="Slide Afiliados" />
          </div>
          {slidesAtivos.afiliados && (
            <>
              <p className="text-xs text-white/40 mb-3 italic">Cole o print completo do dashboard de afiliados (já contém barras, pizza e números).</p>
              <ChartSection {...chartProps(afiliadosBar, "share_agressor", "Print do dashboard de afiliados")} />
            </>
          )}
        </div>

        {/* Análise de Bing */}
        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <SectionLabel number="12b" title="Análise de Bing" />
            <SlideToggle slideKey="analiseBing" label="Slide Bing" />
          </div>
          {slidesAtivos.analiseBing && (
            <>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <p className="text-xs font-semibold text-cyan-300 mb-2">Pizza: Plataformas (Bing vs Google)</p>
                  <ChartSection {...chartProps(bingPizzaPlataforma, "share_agressor", "Print pizza plataformas Bing")} />
                  <textarea value={bingAnalysisPlataforma} onChange={(e) => setBingAnalysisPlataforma(e.target.value)} rows={2} placeholder="Ex: Observamos que 81,7% das ocorrências estão concentradas em Bing Ads..." className="w-full mt-2 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500/30" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-cyan-300 mb-2">Pizza: Termos</p>
                  <ChartSection {...chartProps(bingPizzaTermos, "share_agressor", "Print pizza termos Bing")} />
                  <textarea value={bingAnalysisTermos} onChange={(e) => setBingAnalysisTermos(e.target.value)} rows={2} placeholder="Ex: Entre os termos monitorados, simplesdental destaca-se como o mais impactado..." className="w-full mt-2 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500/30" />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Share Ocorrências Bing */}
        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <SectionLabel number="12c" title="Share de Ocorrências - Bing Ads" />
            <SlideToggle slideKey="bingShare" label="Slide Bing Share" />
          </div>
          {slidesAtivos.bingShare && (
            <>
              <ChartSection {...chartProps(bingShareBar, "share_agressor", "Print share barras Bing")} />
              <div className="mt-3">
                <label className="block text-xs text-white/50 mb-1">Análise</label>
                <input type="text" value={bingShareAnalysis} onChange={(e) => setBingShareAnalysis(e.target.value)}
                  placeholder="Ex: O domínio mercadolivre.com.br permanece como principal agressor em Bing Ads..."
                  className="w-full rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30" />
              </div>
            </>
          )}
        </div>

        {/* Share Ocorrências Somente Concorrentes */}
        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <SectionLabel number="12d" title="Share de Ocorrências - Somente Concorrentes" />
            <SlideToggle slideKey="shareConcorrentes" label="Slide Concorrentes" />
          </div>
          {slidesAtivos.shareConcorrentes && (
            <>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <p className="text-xs font-semibold text-cyan-300 mb-2">Gráfico de barras</p>
                  <ChartSection {...chartProps(concorrentesBar, "share_agressor", "Print barras concorrentes")} />
                  <input type="text" value={concorrentesAnalysis} onChange={(e) => setConcorrentesAnalysis(e.target.value)} placeholder="Ex: O domínio ultradental.com concentra mais de 16% das ocorrências..." className="w-full mt-2 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/30" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-cyan-300 mb-2">Gráfico de pizza (keywords)</p>
                  <ChartSection {...chartProps(concorrentesPizza, "share_agressor", "Print pizza concorrentes")} />
                  <input type="text" value={concorrentesAnalysisPizza} onChange={(e) => setConcorrentesAnalysisPizza(e.target.value)} placeholder="Ex: A keyword simplesdental foi a mais atacada." className="w-full mt-2 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/30" />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Share Ocorrências Somente Whitelist */}
        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <SectionLabel number="12e" title="Share de Ocorrências - Somente Whitelist" />
            <SlideToggle slideKey="shareWhitelist" label="Slide Whitelist" />
          </div>
          {slidesAtivos.shareWhitelist && (
            <>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <p className="text-xs font-semibold text-cyan-300 mb-2">Gráfico de barras</p>
                  <ChartSection {...chartProps(whitelistBar, "share_agressor", "Print barras whitelist")} />
                  <input type="text" value={whitelistAnalysis} onChange={(e) => setWhitelistAnalysis(e.target.value)} placeholder="Ex: Analisando os whitelists, mercadolivre.com.br foi responsável pela maior porcentagem..." className="w-full mt-2 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/30" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-cyan-300 mb-2">Gráfico de pizza (Agressor vs Whitelist)</p>
                  <ChartSection {...chartProps(whitelistPizza, "share_agressor", "Print pizza whitelist")} />
                  <input type="text" value={whitelistAnalysisPizza} onChange={(e) => setWhitelistAnalysisPizza(e.target.value)} placeholder="Ex: Observamos que 23,3% das ocorrências são provenientes de whitelists..." className="w-full mt-2 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/30" />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Trademark - Evidência */}
        <div className={cn("rounded-xl border backdrop-blur-sm p-5", slidesAtivos.trademarkEvidencia ? "border-white/10 bg-white/5" : "border-white/5 bg-white/2 opacity-50")}>
          <div className="flex items-center justify-between mb-3">
            <SectionLabel number="13" title="Trademark - Uso Indevido (Evidências)" />
            <SlideToggle slideKey="trademarkEvidencia" label="Slide 13" />
          </div>
          {slidesAtivos.trademarkEvidencia && <>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs text-white/50 mb-1">Agressores</label>
                <input type="text" value={trademarkAgressores} onChange={(e) => setTrademarkAgressores(e.target.value)}
                  placeholder="Ex: 15"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm text-center font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Ocorrências</label>
                <input type="text" value={trademarkOcorrencias} onChange={(e) => setTrademarkOcorrencias(e.target.value)}
                  placeholder="Ex: 196+"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm text-center font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              </div>
            </div>
            {/* Gráfico share — sem análise de IA, com paste/drag/click */}
            <SimpleImageZone
              label="Print Share de Trademark"
              preview={trademarkShare.preview}
              enabled={chartsAtivos.trademarkShareChart}
              onToggle={() => toggleChart("trademarkShareChart")}
              onFile={(f) => {
                if (trademarkShare.preview) URL.revokeObjectURL(trademarkShare.preview);
                trademarkShare.setFile(f);
                trademarkShare.setPreview(URL.createObjectURL(f));
              }}
              onClear={() => handleClear(trademarkShare)}
            />
            {/* Evidências colapsáveis */}
            <div className="mt-4">
              {trademarkEvidences.map((ev, i) => (
                <details key={i} className="rounded-lg border border-white/10 bg-white/5 mb-2 group">
                  <summary className="cursor-pointer list-none px-3 py-2.5 flex items-center justify-between">
                    <span className="text-xs font-semibold text-cyan-300 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
                      {ev.caption || `Evidência ${i + 1}`}
                    </span>
                    <span className="text-white/30 text-xs group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <div className="px-3 pb-3 space-y-2 border-t border-white/10 pt-2.5">
                    <input type="text" value={ev.caption}
                      onChange={(e) => setTrademarkEvidences((prev) => prev.map((x, idx) => idx === i ? { ...x, caption: e.target.value } : x))}
                      placeholder={`Nome do agressor (ex: wise.com.br)`}
                      className="w-full rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/60" />
                    <SimpleImageZone
                      label="Print da evidência (cole, arraste ou clique)"
                      preview={ev.imageDataUrl ?? ""}
                      onFile={(f) => handleTradEvidImage(i, f)}
                      onClear={() => setTrademarkEvidences((prev) => prev.map((x, idx) => idx === i ? { ...x, imageDataUrl: null } : x))}
                    />
                  </div>
                </details>
              ))}
            </div>
          </>}
        </div>

        {/* Trademark - Aprovação */}
        <div className={cn("rounded-xl border backdrop-blur-sm p-5", slidesAtivos.trademarkAprov ? "border-white/10 bg-white/5" : "border-white/5 bg-white/2 opacity-50")}>
          <div className="flex items-center justify-between mb-3">
            <SectionLabel number="14" title="Trademark - Aguardando Aprovação" />
            <SlideToggle slideKey="trademarkAprov" label="Slide 14" />
          </div>
          {slidesAtivos.trademarkAprov && <>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs text-white/50 mb-1">Agressores aguardando</label>
                <input type="text" value={trademarkAprovAgressores} onChange={(e) => setTrademarkAprovAgressores(e.target.value)}
                  placeholder="Ex: 2"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm text-center font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Ocorrências aguardando</label>
                <input type="text" value={trademarkAprovOcorrencias} onChange={(e) => setTrademarkAprovOcorrencias(e.target.value)}
                  placeholder="Ex: 2"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm text-center font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              </div>
            </div>
            {/* Gráfico aprovação — sem análise de IA, com paste/drag/click */}
            <SimpleImageZone
              label="Print Trademark - Aprovação"
              preview={trademarkAprov.preview}
              enabled={chartsAtivos.trademarkAprovChart}
              onToggle={() => toggleChart("trademarkAprovChart")}
              onFile={(f) => {
                if (trademarkAprov.preview) URL.revokeObjectURL(trademarkAprov.preview);
                trademarkAprov.setFile(f);
                trademarkAprov.setPreview(URL.createObjectURL(f));
              }}
              onClear={() => handleClear(trademarkAprov)}
            />
          </>}
        </div>

        <div className="flex justify-between pt-1">
          <button onClick={() => setStep(2)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white hover:bg-white/10 transition-all">
            <ChevronLeft size={15} />Voltar
          </button>
          <button onClick={() => setStep(4)} className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-cyan-500 text-white hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/20">
            Próximo<ChevronRight size={15} />
          </button>
        </div>
      </div>
    );
  }

  function renderStep4() {
    return (
      <div className="space-y-5">
        {/* Heatmap */}
        <div className={cn("rounded-xl border backdrop-blur-sm p-5", slidesAtivos.heatmap ? "border-white/10 bg-white/5" : "border-white/5 bg-white/2 opacity-50")}>
          <div className="flex items-center justify-between mb-3">
            <SectionLabel number="15" title="Heatmap (com classificação)" />
            <SlideToggle slideKey="heatmap" label="Slide 15" />
          </div>
          {slidesAtivos.heatmap && <>
          {/* Legenda dos ícones em cima — compacta */}
          <div className="flex flex-wrap gap-2 mb-3 p-2 rounded-lg bg-white/5 border border-white/8">
            <span className="text-[10px] text-white/40 font-semibold uppercase tracking-wide self-center mr-1">Legenda:</span>
            {(["sucesso", "whitelist", "tratativa", "parceiro"] as const).map((ic) => (
              <span key={ic} className="flex items-center gap-1 text-[11px] text-white/60 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                {ic === "sucesso" && "✅"}{ic === "whitelist" && "🚫"}{ic === "tratativa" && "🔔"}{ic === "parceiro" && "🤝"}
                <span className="capitalize">{ic === "tratativa" ? "Em tratativa" : ic.charAt(0).toUpperCase() + ic.slice(1)}</span>
              </span>
            ))}
          </div>

          {/* Gráfico — dominante */}
          <ChartSection {...chartProps(heatmap, "heatmap", "Print do heatmap", "heatmap", "heatmapChart")} />

          {/* Classificação — emoji na esquerda como no modelo Branddi */}
          <div className="mt-3 rounded-xl border border-white/8 bg-white/3 p-3">
            <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wide mb-2">
              Classificar agressores (opcional — aparece à esquerda no slide)
            </p>
            <div className="flex flex-col gap-1.5">
              {heatmapRows.map((row, i) => {
                const emojiMap: Record<HeatmapIcon, string> = {
                  sucesso: "✅", whitelist: "🚫", tratativa: "🔔", parceiro: "🤝", nenhum: "⬜",
                };
                const emoji = emojiMap[row.icon];
                return (
                  <div key={i} className="flex gap-2 items-center">
                    {/* Emoji na esquerda — badge visual */}
                    <div className={cn(
                      "w-8 h-8 flex items-center justify-center rounded-lg text-base shrink-0 border",
                      row.icon === "sucesso" && "bg-green-500/20 border-green-500/40",
                      row.icon === "whitelist" && "bg-red-500/20 border-red-500/40",
                      row.icon === "tratativa" && "bg-yellow-500/20 border-yellow-500/40",
                      row.icon === "parceiro" && "bg-blue-500/20 border-blue-500/40",
                      row.icon === "nenhum" && "bg-white/5 border-white/10",
                    )}>
                      {emoji}
                    </div>

                    {/* Domínio */}
                    <input
                      type="text"
                      value={row.domain}
                      onChange={(e) => setHeatmapRows((prev) => prev.map((r, idx) => idx === i ? { ...r, domain: e.target.value } : r))}
                      placeholder="dominio.com.br"
                      className="flex-1 min-w-0 rounded border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-400/30"
                    />

                    {/* Select de classificação — compacto no final */}
                    <select
                      value={row.icon}
                      onChange={(e) => setHeatmapRows((prev) => prev.map((r, idx) => idx === i ? { ...r, icon: e.target.value as HeatmapIcon } : r))}
                      className="rounded border border-white/10 bg-white text-gray-900 px-1.5 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-400/30 w-32 shrink-0"
                    >
                      {HEATMAP_ICONS.map((ic) => (
                        <option key={ic} value={ic}>{HEATMAP_ICON_LABEL[ic]}</option>
                      ))}
                    </select>

                    <button
                      onClick={() => setHeatmapRows((prev) => prev.filter((_, idx) => idx !== i))}
                      className="w-6 h-6 flex items-center justify-center rounded text-white/20 hover:text-red-400 transition-colors shrink-0"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => setHeatmapRows([...heatmapRows, emptyHeatmapRow()])}
              className="mt-2 flex items-center gap-1.5 text-xs text-cyan-400/70 hover:text-cyan-300 font-medium transition-colors"
            >
              <Plus size={12} />Adicionar linha
            </button>
          </div>
          </>}
        </div>

        {/* Evolução */}

        {/* Termos atingidos */}
        <div className={cn("rounded-xl border backdrop-blur-sm p-5", slidesAtivos.termosAtingidos ? "border-white/10 bg-white/5" : "border-white/5 bg-white/2 opacity-50")}>
          <div className="flex items-center justify-between mb-3">
            <SectionLabel number="18" title="Termos atingidos pelos principais agressores" />
            <SlideToggle slideKey="termosAtingidos" label="Slide 18" />
          </div>
          {slidesAtivos.termosAtingidos && <>
            {termosAtingidosRows.map((r, i) => (
              <div key={i} className="grid grid-cols-3 gap-2 mb-2">
                <input type="text" value={r.agressor}
                  onChange={(e) => setTermosAtingidosRows((prev) => prev.map((x, idx) => idx === i ? { ...x, agressor: e.target.value } : x))}
                  placeholder="Agressor"
                  className="rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/60" />
                <div className="col-span-2 flex gap-1">
                  <input type="text" value={r.termos}
                    onChange={(e) => setTermosAtingidosRows((prev) => prev.map((x, idx) => idx === i ? { ...x, termos: e.target.value } : x))}
                    placeholder="Termos atingidos"
                    className="flex-1 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/60" />
                  <button onClick={() => setTermosAtingidosRows((prev) => prev.filter((_, idx) => idx !== i))}
                    className="w-9 h-9 flex items-center justify-center rounded-lg text-white/30 hover:text-red-400 border border-white/10">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
            <button onClick={() => setTermosAtingidosRows([...termosAtingidosRows, { agressor: "", termos: "" }])}
              className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
              <Plus size={14} />Adicionar
            </button>
          </>}
        </div>

        {/* Tratativa em Prioridade */}
        <div className={cn("rounded-xl border backdrop-blur-sm p-5", slidesAtivos.prioridade ? "border-white/10 bg-white/5" : "border-white/5 bg-white/2 opacity-50")}>
          <div className="flex items-center justify-between mb-3">
            <SectionLabel number="19" title="Tratativa em Prioridade" />
            <SlideToggle slideKey="prioridade" label="Slide 19" />
          </div>
          {slidesAtivos.prioridade && <>
            {/* Fase/título da prioridade (exibido acima de tudo no slide) */}
            <div className="mb-3">
              <label className="block text-xs text-white/50 mb-1">Fase / Título da Prioridade</label>
              <input type="text" value={prioridadeAgressor} onChange={(e) => setPrioridadeAgressor(e.target.value)}
                placeholder="Ex: Mediação"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
            </div>

            {/* Layout 2 colunas: esquerda = steps, direita = evidência */}
            <div className="grid grid-cols-2 gap-4">
              {/* Esquerda: steps de mediação */}
              <div>
                <p className="text-xs font-semibold text-cyan-300 mb-2">📋 Descrição / Steps</p>
                {prioridadeMediacaoSteps.map((s, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <span className="w-6 text-xs text-white/40 pt-2.5 shrink-0">{i + 1}.</span>
                    <input type="text" value={s.text}
                      onChange={(e) => setPrioridadeMediacaoSteps((prev) => prev.map((x, idx) => idx === i ? { text: e.target.value } : x))}
                      placeholder="Descreva o passo..."
                      className="flex-1 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/60" />
                    <button onClick={() => setPrioridadeMediacaoSteps((prev) => prev.filter((_, idx) => idx !== i))}
                      className="w-9 h-9 flex items-center justify-center rounded-lg text-white/30 hover:text-red-400 border border-white/10 shrink-0">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                <button onClick={() => setPrioridadeMediacaoSteps([...prioridadeMediacaoSteps, { text: "" }])}
                  className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 font-medium transition-colors mt-1">
                  <Plus size={14} />Adicionar step
                </button>
              </div>

              {/* Direita: evidência com nome acima */}
              <div>
                <p className="text-xs font-semibold text-cyan-300 mb-2">🖼️ Evidência (nome + print)</p>
                <input type="text" value={prioridadeTexto} onChange={(e) => setPrioridadeTexto(e.target.value)}
                  placeholder="Nome do agressor (ex: wise.com.br)"
                  className="w-full rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 px-3 py-2 text-xs mb-2 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/60" />
                <SimpleImageZone
                  label="Print da evidência (cole, arraste ou clique)"
                  preview={prioridadeEvidenciaUrl}
                  onFile={async (f) => {
                    const reader = new FileReader();
                    reader.onload = (ev) => setPrioridadeEvidenciaUrl(ev.target?.result as string);
                    reader.readAsDataURL(f);
                  }}
                  onClear={() => setPrioridadeEvidenciaUrl("")}
                />
              </div>
            </div>
          </>}
        </div>

        {/* Negativações */}
        <div className={cn("rounded-xl border backdrop-blur-sm p-5", slidesAtivos.negativacoes ? "border-white/10 bg-white/5" : "border-white/5 bg-white/2 opacity-50")}>
          <div className="flex items-center justify-between mb-3">
            <SectionLabel number="20" title="Negativações Confirmadas" />
            <SlideToggle slideKey="negativacoes" label="Slide 20" />
          </div>
          {slidesAtivos.negativacoes && <>
            {negativacoes.map((n, i) => (
              <div key={i} className="grid grid-cols-5 gap-2 mb-2">
                <input type="text" value={n.agressor}
                  onChange={(e) => setNegativacoes((prev) => prev.map((x, idx) => idx === i ? { ...x, agressor: e.target.value } : x))}
                  placeholder="Agressor"
                  className="rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/60" />
                <input type="text" value={n.data}
                  onChange={(e) => setNegativacoes((prev) => prev.map((x, idx) => idx === i ? { ...x, data: e.target.value } : x))}
                  placeholder="Data"
                  className="rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/60" />
                <div className="col-span-3 flex gap-1">
                  <input type="text" value={n.observacao}
                    onChange={(e) => setNegativacoes((prev) => prev.map((x, idx) => idx === i ? { ...x, observacao: e.target.value } : x))}
                    placeholder="Observação"
                    className="flex-1 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/60" />
                  <button onClick={() => setNegativacoes((prev) => prev.filter((_, idx) => idx !== i))}
                    className="w-9 h-9 flex items-center justify-center rounded-lg text-white/30 hover:text-red-400 border border-white/10">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
            <button onClick={() => setNegativacoes([...negativacoes, emptyNegRow()])}
              className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
              <Plus size={14} />Adicionar
            </button>
          </>}
        </div>

        <div className="flex justify-between pt-1">
          <button onClick={() => setStep(3)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white hover:bg-white/10 transition-all">
            <ChevronLeft size={15} />Voltar
          </button>
          <button onClick={() => setStep(5)} className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-cyan-500 text-white hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/20">
            Próximo<ChevronRight size={15} />
          </button>
        </div>
      </div>
    );
  }

  function renderStep5() {
    const campanhaSlides = [
      {
        label: "23. CPC mensal", state: cpc, setter: setCpc, type: "cpc" as SlideChartType,
        chartIs: cpcChartIs, chartContains: cpcChartContains,
        keyIs: "cpcChartIs" as ChartKey, keyContains: "cpcChartContains" as ChartKey,
        analysis: cpcAnalysis, setAnalysis: setCpcAnalysis,
      },
      {
        label: "24. CTR mensal", state: ctr, setter: setCtr, type: "ctr" as SlideChartType,
        chartIs: ctrChartIs, chartContains: ctrChartContains,
        keyIs: "ctrChartIs" as ChartKey, keyContains: "ctrChartContains" as ChartKey,
        analysis: ctrAnalysis, setAnalysis: setCtrAnalysis,
      },
      {
        label: "25. Parcela de impressao mensal", state: parcelaImpressao, setter: setParcelaImpressao, type: "parcela_impressao" as SlideChartType,
        chartIs: parcelaChartIs, chartContains: parcelaChartContains,
        keyIs: "parcelaChartIs" as ChartKey, keyContains: "parcelaChartContains" as ChartKey,
        analysis: parcelaAnalysis, setAnalysis: setParcelaAnalysis,
      },
      {
        label: "26. % Impressao 1a posicao", state: impressao1aPosicao, setter: setImpressao1aPosicao, type: "impressao_1a_posicao" as SlideChartType,
        chartIs: pos1ChartIs, chartContains: pos1ChartContains,
        keyIs: "pos1ChartIs" as ChartKey, keyContains: "pos1ChartContains" as ChartKey,
        analysis: pos1Analysis, setAnalysis: setPos1Analysis,
      },
      {
        label: "27. % Impressao Parte Superior", state: impressaoParteSuperior, setter: setImpressaoParteSuperior, type: "impressao_parte_superior" as SlideChartType,
        chartIs: superiorChartIs, chartContains: superiorChartContains,
        keyIs: "superiorChartIs" as ChartKey, keyContains: "superiorChartContains" as ChartKey,
        analysis: superiorAnalysis, setAnalysis: setSuperiorAnalysis,
      },
    ] as const;

    return (
      <div className="space-y-5">
        <div className={cn("rounded-xl border backdrop-blur-sm p-4", slidesAtivos.campanha ? "border-cyan-400/30 bg-cyan-500/5" : "border-white/5 bg-white/2 opacity-50")}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-cyan-300">Slides 23–27: Campanha (CPC, CTR, Parcela, Impressão)</p>
            <SlideToggle slideKey="campanha" label="Slides 23–27" />
          </div>
          {!slidesAtivos.campanha && <p className="text-xs text-white/30 mt-1 italic">Ocultos — não aparecerão no PPTX nem no preview.</p>}
        </div>

        {slidesAtivos.campanha && campanhaSlides.map((s, idx) => (
          <div key={idx} className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-5">
            <h3 className="font-semibold text-sm text-cyan-300 mb-3">{s.label}</h3>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <input type="text" value={s.state.keywordIs}
                onChange={(e) => s.setter({ ...s.state, keywordIs: e.target.value })}
                placeholder="Palavra-Chave E"
                className="rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/30" />
              <input type="text" value={s.state.keywordContains}
                onChange={(e) => s.setter({ ...s.state, keywordContains: e.target.value })}
                placeholder="Palavra-Chave Contem"
                className="rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/30" />
              <input type="text" value={s.state.inicioAtuacao}
                onChange={(e) => s.setter({ ...s.state, inicioAtuacao: e.target.value })}
                placeholder="Inicio (mes/ano)"
                className="rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/30" />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <p className="text-[11px] font-semibold text-cyan-300 mb-1.5">Grafico — Palavra-Chave E</p>
                <ChartSection
                  slot="agressores"
                  uploadLabel="Print da keyword E"
                  preview={s.chartIs.preview}
                  analysisText=""
                  options={null}
                  loading={s.chartIs.loading}
                  enabled={chartsAtivos[s.keyIs]}
                  onToggle={() => toggleChart(s.keyIs)}
                  onFile={(f) => handleChartFile(f, s.type, s.chartIs)}
                  onClear={() => handleClear(s.chartIs)}
                  onSelectAnalysis={() => {}}
                  onEditAnalysis={() => {}}
                  onRegenerate={() => {}}
                />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-cyan-300 mb-1.5">Grafico — Palavra-Chave Contem</p>
                <ChartSection
                  slot="agressores"
                  uploadLabel="Print da keyword Contem"
                  preview={s.chartContains.preview}
                  analysisText=""
                  options={null}
                  loading={s.chartContains.loading}
                  enabled={chartsAtivos[s.keyContains]}
                  onToggle={() => toggleChart(s.keyContains)}
                  onFile={(f) => handleChartFile(f, s.type, s.chartContains)}
                  onClear={() => handleClear(s.chartContains)}
                  onSelectAnalysis={() => {}}
                  onEditAnalysis={() => {}}
                  onRegenerate={() => {}}
                />
              </div>
            </div>

            <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-semibold text-cyan-300">Analise estrategica (cobre os dois graficos)</p>
                {(s.chartIs.file || s.chartContains.file) && (
                  <button
                    type="button"
                    onClick={async () => {
                      const f = s.chartIs.file || s.chartContains.file;
                      if (!f) return;
                      s.chartIs.setLoading(true);
                      const fd = new FormData();
                      fd.append("image", f);
                      fd.append("chartType", s.type);
                      try {
                        const res = await fetch("/api/analyze-presentation-chart", { method: "POST", body: fd });
                        const json = await res.json();
                        if (json.success) { s.setAnalysis(json.data.exemplo1); toast.success("Analise gerada!"); }
                      } catch { toast.error("Erro ao gerar analise."); }
                      s.chartIs.setLoading(false);
                    }}
                    className="text-xs text-white/40 hover:text-cyan-300 transition-colors"
                  >
                    Gerar com IA
                  </button>
                )}
              </div>
              <textarea
                value={s.analysis}
                onChange={(e) => s.setAnalysis(e.target.value)}
                rows={2}
                placeholder="Cole um print e clique Gerar com IA, ou escreva manualmente..."
                className="w-full rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
              />
            </div>
          </div>
        ))}

        <div className={cn("rounded-xl border backdrop-blur-sm p-5", slidesAtivos.saving ? "border-white/10 bg-white/5" : "border-white/5 bg-white/2 opacity-50")}>
          <div className="flex items-center justify-between mb-3">
            <SectionLabel number="28" title="Analise de Saving" />
            <SlideToggle slideKey="saving" label="Slide 28" />
          </div>
          {slidesAtivos.saving && <>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <input type="text" value={saving.keywordIs}
              onChange={(e) => setSaving({ ...saving, keywordIs: e.target.value })}
              placeholder="Palavra-Chave E"
              className="rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/30" />
            <input type="text" value={saving.keywordContains}
              onChange={(e) => setSaving({ ...saving, keywordContains: e.target.value })}
              placeholder="Palavra-Chave Contem"
              className="rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/30" />
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <input type="text" value={saving.inicioAtuacao}
              onChange={(e) => setSaving({ ...saving, inicioAtuacao: e.target.value })}
              placeholder="Inicio (mes/ano)"
              className="rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/30" />
            <input type="text" value={saving.savingValue}
              onChange={(e) => setSaving({ ...saving, savingValue: e.target.value })}
              placeholder="Saving (R$ 999.999)"
              className="rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/30" />
            <input type="text" value={saving.roiValue}
              onChange={(e) => setSaving({ ...saving, roiValue: e.target.value })}
              placeholder="ROI (ex: 99,9)"
              className="rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/30" />
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <p className="text-[11px] font-semibold text-cyan-300 mb-1.5">Tabela E</p>
              <ChartSection slot="agressores" uploadLabel="Print E" preview={savingChartIs.preview} analysisText="" options={null} loading={savingChartIs.loading}
                enabled={chartsAtivos.savingChartIs} onToggle={() => toggleChart("savingChartIs")}
                onFile={(f) => handleChartFile(f, "saving", savingChartIs)} onClear={() => handleClear(savingChartIs)}
                onSelectAnalysis={() => {}} onEditAnalysis={() => {}} onRegenerate={() => {}} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-cyan-300 mb-1.5">Tabela Contem</p>
              <ChartSection slot="agressores" uploadLabel="Print Contem" preview={savingChartContains.preview} analysisText="" options={null} loading={savingChartContains.loading}
                enabled={chartsAtivos.savingChartContains} onToggle={() => toggleChart("savingChartContains")}
                onFile={(f) => handleChartFile(f, "saving", savingChartContains)} onClear={() => handleClear(savingChartContains)}
                onSelectAnalysis={() => {}} onEditAnalysis={() => {}} onRegenerate={() => {}} />
            </div>
          </div>
          <textarea value={saving.analysis} onChange={(e) => setSaving({ ...saving, analysis: e.target.value })}
            rows={2} placeholder="Analise do saving..."
            className="w-full rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500/30" />
          </>}
        </div>

        <div className="flex justify-between pt-1">
          <button onClick={() => setStep(4)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white hover:bg-white/10 transition-all">
            <ChevronLeft size={15} />Voltar
          </button>
          <button onClick={() => setStep(6)} className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-cyan-500 text-white hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/20">
            Proximo<ChevronRight size={15} />
          </button>
        </div>
      </div>
    );
  }

  function renderStep6() {
    return (
      <div className="space-y-5">
        {/* Resolvidos */}
        <div className={cn("rounded-xl border backdrop-blur-sm p-5", slidesAtivos.resolvidos ? "border-white/10 bg-white/5" : "border-white/5 bg-white/2 opacity-50")}>
          <div className="flex items-center justify-between mb-3">
            <SectionLabel number="21" title="Agressores Resolvidos" />
            <SlideToggle slideKey="resolvidos" label="Slide 21" />
          </div>
          {slidesAtivos.resolvidos && <>
            <input type="text" value={resolvedTitle}
              onChange={(e) => setResolvedTitle(e.target.value)}
              placeholder="Título (ex: Mais de 30 agressores resolvidos em Janeiro)"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
            <p className="text-xs text-white/40 mb-3 italic">
              Digite o domínio — a logo é buscada automaticamente. Até 18 domínios.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {resolved.map((r, i) => (
                <ResolvidoCard
                  key={i}
                  entry={r}
                  onChange={(updated) => setResolved((prev) => prev.map((x, idx) => idx === i ? updated : x))}
                  onRemove={resolved.length > 1 ? () => setResolved((prev) => prev.filter((_, idx) => idx !== i)) : undefined}
                />
              ))}
            </div>
            {resolved.length < 18 && (
              <button onClick={() => setResolved([...resolved, { domain: "" }])}
                className="mt-3 flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
                <Plus size={14} />Adicionar
              </button>
            )}
          </>}
        </div>

        {/* Próximos Passos */}
        <div className={cn("rounded-xl border backdrop-blur-sm p-5", slidesAtivos.proximosPassos ? "border-white/10 bg-white/5" : "border-white/5 bg-white/2 opacity-50")}>
          <div className="flex items-center justify-between mb-3">
            <SectionLabel number="29" title="Próximos Passos" />
            <SlideToggle slideKey="proximosPassos" label="Slide 29" />
          </div>
          {slidesAtivos.proximosPassos && <>
            {proximosPassos.map((p, i) => (
              <div key={i} className="flex items-start gap-2 mb-2">
                <input type="checkbox" checked={p.enabled}
                  onChange={() => setProximosPassos((prev) => prev.map((x, idx) => idx === i ? { ...x, enabled: !x.enabled } : x))}
                  className="mt-2 w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 bg-white/10 border-white/20" />
                <input type="text" value={p.text}
                  onChange={(e) => setProximosPassos((prev) => prev.map((x, idx) => idx === i ? { ...x, text: e.target.value } : x))}
                  className="flex-1 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/60" />
                <button onClick={() => setProximosPassos((prev) => prev.filter((_, idx) => idx !== i))}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-white/30 hover:text-red-400 border border-white/10">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            <button onClick={() => setProximosPassos([...proximosPassos, { text: "", enabled: true }])}
              className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
              <Plus size={14} />Adicionar
            </button>
          </>}
        </div>

        {/* Preview & Download */}
        <div className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-5">
          <h3 className="font-bold text-cyan-300 mb-2">📊 Pronto pra gerar!</h3>
          <p className="text-xs text-white/50 mb-4">
            Visualize todos os slides finalizados aqui na tela ou baixe o arquivo .pptx para editar no PowerPoint / Google Slides.
          </p>
          <div className="flex flex-wrap gap-3">
            {/* Ver Preview Visual */}
            <button
              onClick={() => setShowPreview(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-cyan-500 text-white hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/20"
            >
              <Eye size={14} />
              Ver Preview dos Slides
            </button>

            {/* Baixar */}
            <button onClick={downloadPpt} disabled={generating}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-white/10 border border-white/20 text-white hover:bg-white/15 transition-all disabled:opacity-40">
              {generating ? <Loader2 size={14} className="animate-spin" /> : <Presentation size={14} />}
              {generating ? "Gerando..." : "Baixar .pptx"}
            </button>
          </div>

          <p className="text-[11px] text-white/30 mt-3 leading-relaxed">
            💡 <strong className="text-white/40">Dica:</strong> Para abrir no Google Slides, baixe o .pptx e arraste no Google Drive (ele converte automaticamente).
          </p>
        </div>

        <div className="flex justify-between pt-1">
          <button onClick={() => setStep(5)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white hover:bg-white/10 transition-all">
            <ChevronLeft size={15} />Voltar
          </button>
        </div>
      </div>
    );
  }

  // ─── Preview Visual: renderiza todos os slides em HTML ─────────────────────

  function SlidePreview({ children, num, title }: { children: React.ReactNode; num: number; title: string }) {
    return (
      <div className="rounded-xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10">
        <div className="bg-gray-900 px-3 py-1.5 flex items-center justify-between border-b border-white/10">
          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Slide {num}</span>
          <span className="text-[10px] text-white/40">{title}</span>
        </div>
        <div className="aspect-[16/9] bg-white relative overflow-hidden text-[10px]">
          {children}
        </div>
      </div>
    );
  }

  function SlideChromePrev() {
    return (
      <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
        <div className="w-3 h-3 rounded-sm flex items-center justify-center" style={{ background: "#0D3349" }}>
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#4DC0C9" }} />
        </div>
        <span className="text-[10px] font-bold" style={{ color: "#0D3349" }}>branddi</span>
      </div>
    );
  }

  function ChartFrame({ src, className = "" }: { src: string | null; className?: string }) {
    return (
      <div className={cn("rounded border-2 bg-white flex items-center justify-center overflow-hidden", className)}
        style={{ borderColor: "#9FD9DD" }}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="max-w-full max-h-full object-contain" />
        ) : (
          <div className="text-gray-300 text-[8px]">Sem imagem</div>
        )}
      </div>
    );
  }

  function renderSlidesPreview() {
    type Item = { num: number; title: string; render: () => React.ReactNode };
    const list: Item[] = [];
    let n = 0;

    n++;
    list.push({
      num: n, title: "Capa",
      render: () => (
        <div className="absolute inset-0 flex">
          <div className="flex-[0.6] flex flex-col justify-center px-6 relative" style={{ background: "linear-gradient(135deg, #0D3349 0%, #0a4d5c 100%)" }}>
            <div className="absolute top-3 left-3 flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-white/20 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#4DC0C9" }} />
              </div>
              <span className="text-[10px] font-bold text-white">branddi</span>
            </div>
            <h2 className="text-white font-bold" style={{ fontSize: "32px", lineHeight: 1 }}>Status Mensal</h2>
            <p className="mt-1" style={{ color: "#9FD9DD", fontSize: "13px" }}>{monthYear || "Mês | Ano"}</p>
          </div>
          <div className="flex-[0.4] bg-white flex items-center justify-center p-2">
            <p className="font-bold uppercase text-center break-words" style={{ color: "#0D3349", fontSize: "22px" }}>{clientName || "CLIENTE"}</p>
          </div>
        </div>
      ),
    });

    n++;
    list.push({
      num: n, title: "Brand Bidding",
      render: () => (
        <div className="absolute inset-0 flex flex-col justify-center px-6 relative" style={{ background: "linear-gradient(135deg, #0D3349 0%, #0a4d5c 100%)" }}>
          <div className="absolute top-3 left-3 flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-white/20" />
            <span className="text-[10px] font-bold text-white">branddi</span>
          </div>
          <h2 className="text-white font-bold leading-none" style={{ fontSize: "44px" }}>Brand</h2>
          <h2 className="text-white font-bold leading-none mt-1" style={{ fontSize: "44px" }}>Bidding</h2>
        </div>
      ),
    });

    if (slidesAtivos.bigNumbersTotal) {
      n++;
      const notif = parseInt(bigNumbersTotal.notificados) || 0;
      const resolv = parseInt(bigNumbersTotal.resolvidos) || 0;
      const taxa = notif > 0 ? Math.round((resolv / notif) * 100) : 0;
      list.push({
        num: n, title: "Big Numbers (Total)",
        render: () => (
          <div className="absolute inset-0 p-3">
            <SlideChromePrev />
            <h3 className="font-bold mt-3" style={{ color: "#0D3349", fontSize: "16px" }}>Big Numbers</h3>
            <p className="text-[9px] text-gray-500">Período: Toda a parceria</p>
            <div className="grid grid-cols-3 gap-1 mt-2 max-w-[60%]">
              {[
                ["Identif.", bigNumbersTotal.identificados],
                ["Inativos", bigNumbersTotal.inativos],
                ["Ocorr.", bigNumbersTotal.ocorrencias],
                ["Notific.", bigNumbersTotal.notificados],
                ["Resolv.", bigNumbersTotal.resolvidos],
                ["Notif. Env.", bigNumbersTotal.notificacoesEnviadas],
              ].map(([lbl, val], i) => (
                <div key={i} className="text-center">
                  <p className="font-bold leading-none" style={{ color: "#4DC0C9", fontSize: "16px" }}>{val || "—"}</p>
                  <p className="text-[7px] text-gray-500 mt-0.5">{lbl}</p>
                </div>
              ))}
            </div>
            <div className="absolute right-3 top-12 flex flex-col items-center justify-center w-32">
              <p className="font-bold" style={{ color: "#4DC0C9", fontSize: "44px", lineHeight: 1 }}>{taxa}%</p>
              <p className="text-[8px] text-gray-700 text-center mt-1">de sucesso em Takedowns</p>
            </div>
            {economiaTotal && (
              <p className="absolute bottom-2 left-3 text-[7px] text-gray-500 italic">
                *Economia total de R${economiaTotal ? parseFloat(economiaTotal.replace(/\./g,"").replace(",",".")).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}) : ""} em notificações enviadas.
              </p>
            )}
          </div>
        ),
      });
    }

    if (slidesAtivos.bigNumbersMes) {
      n++;
      list.push({
        num: n, title: "Big Numbers (Mês)",
        render: () => (
          <div className="absolute inset-0 p-3">
            <SlideChromePrev />
            <h3 className="font-bold mt-3" style={{ color: "#0D3349", fontSize: "16px" }}>Big Numbers</h3>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <p className="text-[9px] font-bold text-gray-700 mb-1">Todo o Período:</p>
                <div className="grid grid-cols-3 gap-1">
                  {[bigNumbersTotal.identificados, bigNumbersTotal.inativos, bigNumbersTotal.ocorrencias, bigNumbersTotal.notificados, bigNumbersTotal.resolvidos].map((val, i) => (
                    <p key={i} className="text-center font-bold leading-none" style={{ color: "#4DC0C9", fontSize: "13px" }}>{val || "—"}</p>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[9px] font-bold text-gray-700 mb-1">{periodoMes || "Mês"}:</p>
                <div className="grid grid-cols-3 gap-1">
                  {[bigNumbersMes.identificados, bigNumbersMes.inativos, bigNumbersMes.ocorrencias, bigNumbersMes.notificados, bigNumbersMes.resolvidos].map((val, i) => (
                    <p key={i} className="text-center font-bold leading-none" style={{ color: "#4DC0C9", fontSize: "13px" }}>{val || "—"}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ),
      });
    }

    if (slidesAtivos.branddiScore) {
      n++;
      list.push({
        num: n, title: "Branddi Score",
        render: () => (
          <div className="absolute inset-0 p-3 flex flex-col">
            <SlideChromePrev />
            <h3 className="font-bold mt-3" style={{ color: "#0D3349", fontSize: "13px" }}>Branddi Score</h3>
            <p className="text-[7px] text-gray-700 mt-0.5">Mede a blindagem da marca.</p>
            <div className="flex-1 min-h-0 mt-1">
              <ChartFrame src={branddiScore.preview} className="w-full h-full" />
            </div>
            {branddiScore.analysis && <p className="text-[6px] text-gray-500 italic line-clamp-1 mt-0.5">{branddiScore.analysis}</p>}
          </div>
        ),
      });
    }

    if (slidesAtivos.agressoresTotal) {
      n++;
      list.push({
        num: n, title: "Agressores Total",
        render: () => (
          <div className="absolute inset-0 p-3">
            <SlideChromePrev />
            <h3 className="font-bold mt-3" style={{ color: "#0D3349", fontSize: "16px" }}>Agressores</h3>
            {agressoresTotal.analysis && <p className="text-[8px] text-gray-700 mt-1 line-clamp-2">{agressoresTotal.analysis}</p>}
            <ChartFrame src={agressoresTotal.preview} className="absolute top-14 left-3 right-12 bottom-2" />
          </div>
        ),
      });
    }
    if (slidesAtivos.agressoresSemanal) {
      n++;
      list.push({
        num: n, title: "Agressores Semanal",
        render: () => (
          <div className="absolute inset-0 p-3">
            <SlideChromePrev />
            <h3 className="font-bold mt-3" style={{ color: "#0D3349", fontSize: "16px" }}>Agressores</h3>
            {agressoresSemanal.analysis && <p className="text-[8px] text-gray-700 mt-1 line-clamp-2">{agressoresSemanal.analysis}</p>}
            <ChartFrame src={agressoresSemanal.preview} className="absolute top-14 left-3 right-12 bottom-2" />
          </div>
        ),
      });
    }

    if (slidesAtivos.termos1) {
      n++;
      list.push({
        num: n, title: "Termos V1",
        render: () => (
          <div className="absolute inset-0 p-3">
            <SlideChromePrev />
            <h3 className="font-bold mt-3" style={{ color: "#0D3349", fontSize: "16px" }}>Análise de Termos</h3>
            <div className="grid grid-cols-2 gap-2 mt-2 absolute top-10 left-3 right-3 bottom-2">
              <ChartFrame src={termosComposto.preview} />
              <ChartFrame src={termoPuro.preview} />
            </div>
          </div>
        ),
      });
    }
    if (slidesAtivos.slideVazio) {
      n++;
      list.push({
        num: n, title: "Decorativo",
        render: () => <div className="absolute inset-0 p-3"><SlideChromePrev /></div>,
      });
    }

    if (slidesAtivos.shareKeyword) {
      n++;
      list.push({
        num: n, title: "Share Keyword",
        render: () => (
          <div className="absolute inset-0 p-3">
            <SlideChromePrev />
            <h3 className="font-bold mt-3" style={{ color: "#0D3349", fontSize: "14px" }}>Análise de Share de Ocorrências</h3>
            <ChartFrame src={shareKeyword.preview} className="absolute top-10 left-3 right-3 bottom-8" />
            {shareKeyword.analysis && <p className="absolute bottom-1 left-3 right-3 text-[7px] italic line-clamp-2" style={{ color: "#1A6CB0" }}>📌 {shareKeyword.analysis}</p>}
          </div>
        ),
      });
    }
    if (slidesAtivos.shareAgressor) {
      n++;
      list.push({
        num: n, title: "Share Agressor",
        render: () => (
          <div className="absolute inset-0 p-3">
            <SlideChromePrev />
            <h3 className="font-bold mt-3" style={{ color: "#0D3349", fontSize: "14px" }}>Análise de Share de Ocorrências</h3>
            <ChartFrame src={shareAgressor.preview} className="absolute top-10 left-3 right-3 bottom-10" />
            {shareAgressor.analysis && <p className="absolute bottom-4 left-3 right-3 text-[7px] italic line-clamp-1" style={{ color: "#1A6CB0" }}>📌 {shareAgressor.analysis}</p>}
            {shareAgressorAnalysis2 && <p className="absolute bottom-1 left-3 right-3 text-[7px] italic line-clamp-1" style={{ color: "#1A6CB0" }}>📌 {shareAgressorAnalysis2}</p>}
          </div>
        ),
      });
    }

    if (slidesAtivos.afiliados) {
      n++;
      list.push({
        num: n, title: "Afiliados",
        render: () => (
          <div className="absolute inset-0 p-3">
            <SlideChromePrev />
            <h3 className="font-bold mt-3" style={{ color: "#0D3349", fontSize: "14px" }}>Afiliados</h3>
            <ChartFrame src={afiliadosBar.preview} className="absolute top-10 left-3 right-3 bottom-3" />
          </div>
        ),
      });
    }

    if (slidesAtivos.analiseBing) {
      n++;
      list.push({
        num: n, title: "Análise de Bing",
        render: () => (
          <div className="absolute inset-0 p-3">
            <SlideChromePrev />
            <h3 className="font-bold mt-3" style={{ color: "#0D3349", fontSize: "14px" }}>Análise de Bing</h3>
            <div className="absolute top-10 left-3 right-3 flex gap-1" style={{ bottom: "28px" }}>
              <div className="flex-1 border border-cyan-200 rounded overflow-hidden">{bingPizzaPlataforma.preview && <img src={bingPizzaPlataforma.preview} className="w-full h-full object-contain" />}</div>
              <div className="flex-1 border border-cyan-200 rounded overflow-hidden">{bingPizzaTermos.preview && <img src={bingPizzaTermos.preview} className="w-full h-full object-contain" />}</div>
            </div>
          </div>
        ),
      });
    }

    if (slidesAtivos.bingShare) {
      n++;
      list.push({
        num: n, title: "Share Bing Ads",
        render: () => (
          <div className="absolute inset-0 p-3">
            <SlideChromePrev />
            <h3 className="font-bold mt-3" style={{ color: "#0D3349", fontSize: "14px" }}>Share de Ocorrências — Bing</h3>
            <ChartFrame src={bingShareBar.preview} className="absolute top-10 left-3 right-3 bottom-6" />
          </div>
        ),
      });
    }

    if (slidesAtivos.shareConcorrentes) {
      n++;
      list.push({
        num: n, title: "Share Concorrentes",
        render: () => (
          <div className="absolute inset-0 p-3">
            <SlideChromePrev />
            <h3 className="font-bold mt-3" style={{ color: "#0D3349", fontSize: "14px" }}>Share — Somente Concorrentes</h3>
            <div className="absolute top-10 left-3 right-3 flex gap-1" style={{ bottom: "12px" }}>
              <div className="flex-1 border border-cyan-200 rounded overflow-hidden">{concorrentesBar.preview && <img src={concorrentesBar.preview} className="w-full h-full object-contain" />}</div>
              <div className="w-16 border border-cyan-200 rounded overflow-hidden">{concorrentesPizza.preview && <img src={concorrentesPizza.preview} className="w-full h-full object-contain" />}</div>
            </div>
          </div>
        ),
      });
    }

    if (slidesAtivos.shareWhitelist) {
      n++;
      list.push({
        num: n, title: "Share Whitelist",
        render: () => (
          <div className="absolute inset-0 p-3">
            <SlideChromePrev />
            <h3 className="font-bold mt-3" style={{ color: "#0D3349", fontSize: "14px" }}>Share — Somente Whitelist</h3>
            <div className="absolute top-10 left-3 right-3 flex gap-1" style={{ bottom: "12px" }}>
              <div className="flex-1 border border-cyan-200 rounded overflow-hidden">{whitelistBar.preview && <img src={whitelistBar.preview} className="w-full h-full object-contain" />}</div>
              <div className="w-16 border border-cyan-200 rounded overflow-hidden">{whitelistPizza.preview && <img src={whitelistPizza.preview} className="w-full h-full object-contain" />}</div>
            </div>
          </div>
        ),
      });
    }

    if (slidesAtivos.trademarkEvidencia) {
      n++;
      list.push({
        num: n, title: "Trademark Evidências",
        render: () => (
          <div className="absolute inset-0 p-3">
            <SlideChromePrev />
            <h3 className="font-bold mt-3" style={{ color: "#0D3349", fontSize: "13px" }}>Uso Indevido de Trademark</h3>
            <div className="flex gap-2 mt-2">
              <div className="bg-gray-50 border border-gray-200 rounded p-1 text-center w-14">
                <p className="font-bold leading-none" style={{ color: "#4DC0C9", fontSize: "14px" }}>{trademarkAgressores || "—"}</p>
                <p className="text-[7px] text-gray-500">Agressores</p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded p-1 text-center w-14">
                <p className="font-bold leading-none" style={{ color: "#4DC0C9", fontSize: "14px" }}>{trademarkOcorrencias || "—"}</p>
                <p className="text-[7px] text-gray-500">Ocorrências</p>
              </div>
            </div>
            <ChartFrame src={trademarkShare.preview} className="absolute left-3 bottom-3 w-[55%] h-[55%]" />
          </div>
        ),
      });
    }
    if (slidesAtivos.trademarkAprov) {
      n++;
      list.push({
        num: n, title: "Trademark Aprovação",
        render: () => (
          <div className="absolute inset-0 p-3">
            <SlideChromePrev />
            <h3 className="font-bold mt-3" style={{ color: "#0D3349", fontSize: "13px" }}>Trademark - Aguardando Aprovação</h3>
            <ChartFrame src={trademarkAprov.preview} className="absolute right-3 top-10 w-[55%] bottom-2" />
          </div>
        ),
      });
    }

    if (slidesAtivos.heatmap) {
      n++;
      const iconesUsados = new Set<HeatmapIcon>();
      heatmapRows.forEach((r) => { if (r.icon !== "nenhum" && r.domain.trim()) iconesUsados.add(r.icon); });
      const ordem: HeatmapIcon[] = ["sucesso", "whitelist", "tratativa", "parceiro"];
      const usados = ordem.filter((ic) => iconesUsados.has(ic));
      const labels: Record<HeatmapIcon, string> = { sucesso: "Sucesso", whitelist: "Whitelist", tratativa: "Em tratativa", parceiro: "Parceiro", nenhum: "" };
      const emojis: Record<HeatmapIcon, string> = { sucesso: "✅", whitelist: "🚫", tratativa: "🔔", parceiro: "🤝", nenhum: "" };
      list.push({
        num: n, title: "Heatmap",
        render: () => (
          <div className="absolute inset-0 p-3">
            <SlideChromePrev />
            <h3 className="font-bold mt-3" style={{ color: "#0D3349", fontSize: "13px" }}>Heatmap</h3>
            {usados.length > 0 && (
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {usados.map((ic) => (
                  <span key={ic} className="text-[7px] px-1.5 py-0.5 rounded-full bg-gray-50 border border-cyan-200 font-semibold" style={{ color: "#0D3349" }}>
                    {emojis[ic]} {labels[ic]}
                  </span>
                ))}
              </div>
            )}
            <ChartFrame src={heatmap.preview} className="absolute left-3 right-3 top-12 bottom-10" />
          </div>
        ),
      });
    }

    if (slidesAtivos.evolucao) {
      n++;
      list.push({
        num: n, title: "Evolução",
        render: () => (
          <div className="absolute inset-0 p-3">
            <SlideChromePrev />
            <h3 className="font-bold mt-3" style={{ color: "#0D3349", fontSize: "13px" }}>Evolução de agressividade</h3>
            <table className="w-full mt-2 text-[7px]">
              <thead>
                <tr style={{ background: "#0D3349" }}>
                  <th className="text-white p-1 text-left">Domínio</th>
                  {evolucaoMeses.map((m, i) => <th key={i} className="text-white p-1">{m}</th>)}
                </tr>
              </thead>
              <tbody>
                {evolucaoRows.filter((r) => r.domain.trim()).slice(0, 5).map((r, i) => (
                  <tr key={i} className="border-b border-gray-200">
                    <td className="p-1 text-gray-800">{r.domain}</td>
                    <td className="p-1 text-center text-gray-700">{r.mes1}</td>
                    <td className="p-1 text-center text-gray-700">{r.mes2}</td>
                    <td className="p-1 text-center text-gray-700">{r.mes3}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ),
      });
    }

    if (slidesAtivos.tratativas) {
      n++;
      list.push({
        num: n, title: "Tratativas",
        render: () => (
          <div className="absolute inset-0 p-3">
            <SlideChromePrev />
            <h3 className="font-bold mt-3" style={{ color: "#0D3349", fontSize: "13px" }}>Tratativas em Andamento</h3>
            <table className="w-full mt-2 text-[7px]">
              <thead>
                <tr style={{ background: "#0D3349" }}>
                  {["Agressor", "Termos", "Top", "Notif.", "Última", "Resp.", "Obs."].map((h, i) => <th key={i} className="text-white p-0.5">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {tratativas.filter((t) => t.agressor.trim()).slice(0, 4).map((t, i) => (
                  <tr key={i} className="border-b border-gray-200">
                    <td className="p-0.5 text-gray-800">{t.agressor}</td>
                    <td className="p-0.5 text-gray-700">{t.termos}</td>
                    <td className="p-0.5 text-center">{t.topLeilao === "sim" ? "✓" : "—"}</td>
                    <td className="p-0.5 text-center text-gray-700">{t.notificacoes}</td>
                    <td className="p-0.5 text-center text-gray-700">{t.ultimaComunicacao}</td>
                    <td className="p-0.5 text-center">{t.respondeu === "sim" ? "✓" : "—"}</td>
                    <td className="p-0.5 text-gray-700 line-clamp-1">{t.observacao}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ),
      });
    }

    if (slidesAtivos.termosAtingidos) {
      n++;
      list.push({
        num: n, title: "Termos atingidos",
        render: () => (
          <div className="absolute inset-0 p-3">
            <SlideChromePrev />
            <h3 className="font-bold mt-3" style={{ color: "#0D3349", fontSize: "13px" }}>Termos atingidos pelos principais agressores</h3>
            <table className="w-full mt-2 text-[8px]">
              <thead>
                <tr style={{ background: "#0D3349" }}>
                  <th className="text-white p-1 text-left">Agressor</th>
                  <th className="text-white p-1 text-left">Termos</th>
                </tr>
              </thead>
              <tbody>
                {termosAtingidosRows.filter((r) => r.agressor.trim()).slice(0, 5).map((r, i) => (
                  <tr key={i} className="border-b border-gray-200">
                    <td className="p-1 text-gray-800">{r.agressor}</td>
                    <td className="p-1 text-gray-700">{r.termos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ),
      });
    }

    if (slidesAtivos.prioridade) {
      n++;
      list.push({
        num: n, title: "Tratativa Prioridade",
        render: () => (
          <div className="absolute inset-0 p-3">
            <SlideChromePrev />
            <h3 className="font-bold mt-3" style={{ color: "#0D3349", fontSize: "13px" }}>Tratativa em Prioridade</h3>
            <p className="font-bold mt-1" style={{ color: "#0D3349", fontSize: "11px" }}>Mediação</p>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <ol className="text-[8px] space-y-0.5">
                {prioridadeMediacaoSteps.filter((s) => s.text.trim()).slice(0, 4).map((s, i) => (
                  <li key={i}>{i + 1}. {s.text}</li>
                ))}
              </ol>
              <div className="border border-cyan-200 rounded p-2 text-center">
                <p className="font-bold" style={{ color: "#0D3349", fontSize: "10px" }}>{prioridadeAgressor || "—"}</p>
              </div>
            </div>
          </div>
        ),
      });
    }

    if (slidesAtivos.negativacoes) {
      n++;
      list.push({
        num: n, title: "Negativações",
        render: () => (
          <div className="absolute inset-0 p-3">
            <SlideChromePrev />
            <h3 className="font-bold mt-3" style={{ color: "#0D3349", fontSize: "13px" }}>Negativações Confirmadas</h3>
            <table className="w-full mt-2 text-[8px]">
              <thead>
                <tr style={{ background: "#0D3349" }}>
                  <th className="text-white p-1 text-left">Agressor</th>
                  <th className="text-white p-1">Data</th>
                  <th className="text-white p-1 text-left">Observação</th>
                </tr>
              </thead>
              <tbody>
                {negativacoes.filter((nn) => nn.agressor.trim()).slice(0, 5).map((r, i) => (
                  <tr key={i} className="border-b border-gray-200">
                    <td className="p-1 text-gray-800">{r.agressor}</td>
                    <td className="p-1 text-center text-gray-700">{r.data}</td>
                    <td className="p-1 text-gray-700">{r.observacao}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ),
      });
    }

    if (slidesAtivos.resolvidos) {
      n++;
      list.push({
        num: n, title: "Resolvidos",
        render: () => (
          <div className="absolute inset-0 p-3">
            <SlideChromePrev />
            <h3 className="font-bold mt-3" style={{ color: "#0D3349", fontSize: "13px" }}>{resolvedTitle || "Agressores resolvidos"}</h3>
            <p className="text-[8px] text-gray-700 mt-1">A Branddi atuou 24/7.</p>
            <div className="grid grid-cols-3 gap-1 mt-2 max-w-[55%] absolute right-3 top-10">
              {resolved.filter((r) => r.domain.trim()).slice(0, 9).map((r, i) => (
                <div key={i} className="border border-gray-200 bg-gray-50 rounded p-1 text-center">
                  <p className="text-[6px] font-bold" style={{ color: "#0D3349" }}>{r.domain}</p>
                </div>
              ))}
            </div>
          </div>
        ),
      });
    }

    if (slidesAtivos.campanha || slidesAtivos.saving) {
      n++;
      list.push({
        num: n, title: "Resultados de campanha",
        render: () => (
          <div className="absolute inset-0 flex flex-col justify-center px-6" style={{ background: "linear-gradient(135deg, #0D3349 0%, #0a4d5c 100%)" }}>
            <h2 className="text-white font-bold leading-none" style={{ fontSize: "28px" }}>Resultados</h2>
            <h2 className="text-white font-bold leading-none mt-1" style={{ fontSize: "28px" }}>de campanha</h2>
          </div>
        ),
      });
    }

    if (slidesAtivos.campanha) {
      const cs = [
        { lbl: "CPC mensal", chart: cpcChartIs, data: cpc },
        { lbl: "CTR mensal", chart: ctrChartIs, data: ctr },
        { lbl: "Parcela impressão", chart: parcelaChartIs, data: parcelaImpressao },
        { lbl: "Imp. 1ª posição", chart: pos1ChartIs, data: impressao1aPosicao },
        { lbl: "Imp. Parte Superior", chart: superiorChartIs, data: impressaoParteSuperior },
      ];
      cs.forEach((c, csIdx) => {
        n++;
        const containsChart = [cpcChartContains, ctrChartContains, parcelaChartContains, pos1ChartContains, superiorChartContains][csIdx];
        list.push({
          num: n, title: c.lbl,
          render: () => (
            <div className="absolute inset-0 p-3 flex flex-col">
              <SlideChromePrev />
              <h3 className="font-bold mt-3" style={{ color: "#0D3349", fontSize: "11px" }}>{c.lbl}</h3>
              {/* É - topo */}
              <p className="text-[6px] font-bold text-center mt-1" style={{ color: "#0D3349" }}>Palavra-Chave é: &quot;{c.data.keywordIs || "—"}&quot;</p>
              <div className="flex-1 min-h-0">
                <ChartFrame src={c.chart.preview} className="w-full h-full" />
              </div>
              {/* Contém - baixo */}
              <p className="text-[6px] font-bold text-center mt-1" style={{ color: "#0D3349" }}>Palavra-Chave contém: &quot;{c.data.keywordContains || "—"}&quot;</p>
              <div className="flex-1 min-h-0">
                <ChartFrame src={containsChart.preview} className="w-full h-full" />
              </div>
              {c.chart.analysis && <p className="text-[5px] text-gray-500 italic text-center mt-0.5 line-clamp-1">{c.chart.analysis}</p>}
            </div>
          ),
        });
      });
    }

    if (slidesAtivos.saving) {
      // Slide saving É
      n++;
      list.push({
        num: n, title: "Saving (É)",
        render: () => (
          <div className="absolute inset-0 p-3 flex flex-col">
            <SlideChromePrev />
            <h3 className="font-bold mt-3" style={{ color: "#0D3349", fontSize: "11px" }}>Análise de Saving</h3>
            <p className="text-[6px] font-bold text-center" style={{ color: "#0D3349" }}>Palavra-Chave é: &quot;{saving.keywordIs || "—"}&quot;</p>
            <div className="flex gap-1 mt-1">
              <div className="rounded p-1 text-center flex-1" style={{ background: "#4DC0C9" }}>
                <p className="text-white text-[6px]">Saving</p>
                <p className="text-white font-bold" style={{ fontSize: "10px" }}>R$ {saving.savingValue || "—"}</p>
              </div>
              <div className="rounded p-1 text-center flex-1" style={{ background: "#0D3349" }}>
                <p className="text-white text-[6px]">ROI</p>
                <p className="font-bold" style={{ color: "#4DC0C9", fontSize: "10px" }}>{saving.roiValue || "—"}</p>
              </div>
            </div>
            <div className="flex-1 min-h-0 mt-1">
              <ChartFrame src={savingChartIs.preview} className="w-full h-full" />
            </div>
          </div>
        ),
      });
      // Slide saving Contém
      n++;
      list.push({
        num: n, title: "Saving (Contém)",
        render: () => (
          <div className="absolute inset-0 p-3 flex flex-col">
            <SlideChromePrev />
            <h3 className="font-bold mt-3" style={{ color: "#0D3349", fontSize: "11px" }}>Análise de Saving</h3>
            <p className="text-[6px] font-bold text-center" style={{ color: "#0D3349" }}>Palavra-Chave contém: &quot;{saving.keywordContains || "—"}&quot;</p>
            <div className="flex gap-1 mt-1">
              <div className="rounded p-1 text-center flex-1" style={{ background: "#4DC0C9" }}>
                <p className="text-white text-[6px]">Saving</p>
                <p className="text-white font-bold" style={{ fontSize: "10px" }}>R$ {saving.savingValue || "—"}</p>
              </div>
              <div className="rounded p-1 text-center flex-1" style={{ background: "#0D3349" }}>
                <p className="text-white text-[6px]">ROI</p>
                <p className="font-bold" style={{ color: "#4DC0C9", fontSize: "10px" }}>{saving.roiValue || "—"}</p>
              </div>
            </div>
            <div className="flex-1 min-h-0 mt-1">
              <ChartFrame src={savingChartContains.preview} className="w-full h-full" />
            </div>
          </div>
        ),
      });
    }

    if (slidesAtivos.proximosPassos) {
      n++;
      list.push({
        num: n, title: "Próximos Passos",
        render: () => (
          <div className="absolute inset-0 p-3">
            <SlideChromePrev />
            <h3 className="font-bold mt-3" style={{ color: "#0D3349", fontSize: "13px" }}>Próximos Passos</h3>
            <ol className="text-[8px] space-y-1 mt-2">
              {proximosPassos.filter((p) => p.enabled).map((p, i) => (
                <li key={i} style={{ color: "#0D3349" }}>
                  <span className="font-bold" style={{ color: "#4DC0C9" }}>{i + 1}.</span> {p.text}
                </li>
              ))}
            </ol>
          </div>
        ),
      });
    }

    n++;
    list.push({
      num: n, title: "Encerramento",
      render: () => (
        <div className="absolute inset-0 flex flex-col justify-center px-6" style={{ background: "linear-gradient(135deg, #0D3349 0%, #0a4d5c 100%)" }}>
          <h2 className="text-white font-bold leading-tight" style={{ fontSize: "20px" }}>Você investe todos os dias para crescer.</h2>
          <p className="mt-2" style={{ color: "#9FD9DD", fontSize: "13px" }}>E a Branddi garante que esse esforço não seja desperdiçado.</p>
          <p className="text-white text-[8px] italic mt-4">Ficou com alguma dúvida?</p>
          <p className="mt-1" style={{ color: "#9FD9DD", fontSize: "8px" }}>atendimento@branddi.com · +55 11 92145-8912</p>
        </div>
      ),
    });

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((s) => (
          <SlidePreview key={s.num} num={s.num} title={s.title}>{s.render()}</SlidePreview>
        ))}
      </div>
    );
  }

  return (
    <div
      className="flex flex-col flex-1 overflow-hidden"
      style={{ background: "linear-gradient(135deg, #061520 0%, #0a2235 40%, #0d3349 70%, #0a4d5c 100%)" }}
    >
      {/* Efeito de grade tecnológica no fundo */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: "linear-gradient(rgba(77,192,201,1) 1px, transparent 1px), linear-gradient(90deg, rgba(77,192,201,1) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="flex-1 overflow-y-auto p-6 relative">
        <div className="max-w-3xl mx-auto">
          {/* StepIndicator dark */}
          <div className="flex items-center justify-center gap-0 mb-6 flex-wrap">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center">
                <div className="flex flex-col items-center gap-1.5">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all",
                    step > s.id
                      ? "bg-cyan-500 border-cyan-500 text-white"
                      : step === s.id
                      ? "border-cyan-400 text-cyan-400 bg-cyan-400/10"
                      : "border-white/20 text-white/30 bg-white/5"
                  )}>
                    {step > s.id ? <Check size={14} /> : s.id}
                  </div>
                  <span className={cn(
                    "text-[10px] font-medium whitespace-nowrap max-w-[100px] text-center",
                    step === s.id ? "text-cyan-400" : "text-white/30"
                  )}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={cn(
                    "h-0.5 w-8 mx-1 mt-[-14px] transition-all",
                    step > s.id ? "bg-cyan-500" : "bg-white/10"
                  )} />
                )}
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-2xl shadow-black/40 p-6">
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
            {step === 5 && renderStep5()}
            {step === 6 && renderStep6()}
          </div>
        </div>
      </div>

      {/* ─── MODAL PREVIEW VISUAL ─── */}
      {showPreview && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto"
          style={{ background: "linear-gradient(135deg, #061520 0%, #0a2235 100%)" }}
        >
          {/* Header fixo */}
          <div className="sticky top-0 z-10 backdrop-blur-md bg-black/60 border-b border-white/10 px-6 py-3 flex items-center justify-between">
            <div>
              <h2 className="text-white font-bold text-lg">📊 Preview dos Slides</h2>
              <p className="text-white/50 text-xs">Visualização de como ficará o PPT finalizado</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={downloadPpt}
                disabled={generating}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-cyan-500 text-white hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-40"
              >
                {generating ? <Loader2 size={14} className="animate-spin" /> : <Presentation size={14} />}
                {generating ? "Gerando..." : "Baixar .pptx"}
              </button>
              <button
                onClick={() => setShowPreview(false)}
                className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                title="Fechar preview"
              >
                ✕
              </button>
            </div>
          </div>
          {/* Grid dos slides */}
          <div className="p-6 max-w-7xl mx-auto">
            {renderSlidesPreview()}
          </div>
        </div>
      )}
    </div>
  );
}
