"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import {
  FileSearch,
  Loader2,
  ClipboardCopy,
  Check,
  Tag,
  Bell,
  Calendar,
  MessageCircle,
  Eye,
  EyeOff,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ResumoResult {
  nomeAgressor: string;
  etiquetaTopLeilao: "Ativada" | "Não ativada";
  notificacoesEnviadas: number;
  ultimaComunicacao: string | null;
  retorno: "Sim" | "Não";
  observacao: string;
}

// ─── Copy Button ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Erro ao copiar.");
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="w-7 h-7 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all"
      title="Copiar"
    >
      {copied ? <Check size={12} className="text-primary" /> : <ClipboardCopy size={12} />}
    </button>
  );
}

// ─── Result Field ─────────────────────────────────────────────────────────────

function ResultField({
  icon: Icon,
  label,
  value,
  badge,
  badgeColor,
  mono,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  badge?: boolean;
  badgeColor?: "green" | "yellow" | "red" | "blue";
  mono?: boolean;
}) {
  const badgeClasses = {
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    yellow: "bg-amber-50 text-amber-700 border-amber-200",
    red: "bg-red-50 text-red-600 border-red-200",
    blue: "bg-primary/5 text-primary border-primary/20",
  };

  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
      <div className="w-7 h-7 rounded-lg bg-primary/5 flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={14} className="text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
          {label}
        </p>
        {badge && badgeColor ? (
          <span
            className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border",
              badgeClasses[badgeColor]
            )}
          >
            {value}
          </span>
        ) : (
          <p className={cn("text-sm text-foreground leading-relaxed", mono && "font-mono")}>
            {value}
          </p>
        )}
      </div>
      <CopyButton text={value} />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ResumoTratativaClient() {
  const [cardUrl, setCardUrl] = useState("");
  const [pipefyToken, setPipefyToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResumoResult | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    if (!cardUrl.trim()) {
      toast.error("Cole a URL do card do Pipefy.");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/resumo-tratativa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardUrl: cardUrl.trim(), pipefyToken: pipefyToken.trim() || undefined }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || "Erro ao gerar resumo.");
        return;
      }
      setResult(json.data as ResumoResult);
      toast.success("Resumo gerado com sucesso!");
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  function buildFullText(r: ResumoResult) {
    const lines = [
      `Nome do Agressor: ${r.nomeAgressor}`,
      `Etiqueta Top Leilão: ${r.etiquetaTopLeilao}`,
      `Notificações Enviadas: ${r.notificacoesEnviadas}`,
      `Última Comunicação: ${r.ultimaComunicacao ?? "—"}`,
      `Retorno: ${r.retorno}`,
      `Observação: ${r.observacao}`,
    ];
    return lines.join("\n");
  }

  async function copyAll() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(buildFullText(result));
      setCopied(true);
      toast.success("Resumo completo copiado!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Erro ao copiar.");
    }
  }

  function reset() {
    setResult(null);
    setCardUrl("");
  }

  return (
    <div className="flex flex-col flex-1 bg-background overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-5">

          {/* Input card */}
          <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                URL do Card (Pipefy)
              </label>
              <input
                type="url"
                value={cardUrl}
                onChange={(e) => setCardUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !loading && handleGenerate()}
                placeholder="https://app.pipefy.com/open-cards/594136233"
                className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                disabled={loading}
              />
            </div>

            {/* Token field */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Token pessoal da API do Pipefy{" "}
                <span className="font-normal text-muted-foreground/70">
                  (Pipefy → Perfil → Tokens de Acesso)
                </span>
              </label>
              <div className="relative">
                <input
                  type={showToken ? "text" : "password"}
                  value={pipefyToken}
                  onChange={(e) => setPipefyToken(e.target.value)}
                  placeholder="••••••••••••••••••••"
                  className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowToken((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading || !cardUrl.trim()}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Buscando dados e gerando resumo...
                </>
              ) : (
                <>
                  <FileSearch size={15} />
                  Gerar Resumo
                </>
              )}
            </button>
          </div>

          {/* Result card */}
          {result && (
            <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
              {/* Result header */}
              <div className="bg-[#0d3349] px-5 py-3.5 flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-[10px] font-medium uppercase tracking-wider">
                    Branddi Monitor
                  </p>
                  <h2 className="text-white font-bold text-sm mt-0.5">
                    Resumo de Tratativa
                  </h2>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={reset}
                    title="Nova consulta"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 transition-all border border-white/20"
                  >
                    <RotateCcw size={11} />
                    Nova consulta
                  </button>
                  <button
                    onClick={copyAll}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-white/15 hover:bg-white/25 transition-all border border-white/20"
                  >
                    {copied ? <Check size={11} /> : <ClipboardCopy size={11} />}
                    {copied ? "Copiado!" : "Copiar tudo"}
                  </button>
                </div>
              </div>

              {/* Fields */}
              <div className="px-5 py-1 divide-y divide-border/0">
                <ResultField
                  icon={FileSearch}
                  label="Nome do Agressor"
                  value={result.nomeAgressor}
                  mono
                />
                <ResultField
                  icon={Tag}
                  label="Etiqueta Top Leilão"
                  value={result.etiquetaTopLeilao}
                  badge
                  badgeColor={result.etiquetaTopLeilao === "Ativada" ? "yellow" : "blue"}
                />
                <ResultField
                  icon={Bell}
                  label="Notificações Enviadas"
                  value={String(result.notificacoesEnviadas)}
                />
                <ResultField
                  icon={Calendar}
                  label="Última Comunicação"
                  value={result.ultimaComunicacao ?? "—"}
                />
                <ResultField
                  icon={MessageCircle}
                  label="Retorno"
                  value={result.retorno}
                  badge
                  badgeColor={result.retorno === "Sim" ? "green" : "red"}
                />

                {/* Observação com contador */}
                <div className="flex items-start gap-3 py-3">
                  <div className="w-7 h-7 rounded-lg bg-primary/5 flex items-center justify-center shrink-0 mt-0.5">
                    <FileSearch size={14} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                        Observação
                      </p>
                      <span
                        className={cn(
                          "text-[10px] font-medium",
                          result.observacao.length > 200
                            ? "text-red-500"
                            : "text-muted-foreground"
                        )}
                      >
                        {result.observacao.length}/200
                      </span>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{result.observacao}</p>
                    {result.observacao.length > 200 && (
                      <p className="text-xs text-red-500 mt-1">
                        Atenção: observação excede 200 caracteres. Edite antes de usar.
                      </p>
                    )}
                  </div>
                  <CopyButton text={result.observacao} />
                </div>
              </div>

              {/* Raw text preview */}
              <details className="border-t border-border">
                <summary className="px-5 py-3 text-xs font-medium cursor-pointer hover:bg-slate-50 text-muted-foreground select-none">
                  Ver texto formatado para colar
                </summary>
                <pre className="px-5 py-3 text-xs font-mono bg-slate-50 whitespace-pre-wrap border-t border-border text-foreground">
                  {buildFullText(result)}
                </pre>
              </details>
            </div>
          )}

          {/* Help text */}
          {!result && !loading && (
            <div className="rounded-xl border border-dashed border-border p-5 text-center">
              <FileSearch size={28} className="mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">Como usar</p>
              <p className="text-xs text-muted-foreground/70 mt-1 max-w-sm mx-auto leading-relaxed">
                Vá ao Pipefy, abra o card do agressor, copie a URL do navegador e cole acima.
                Insira seu token pessoal e a IA irá buscar os dados e gerar o resumo automaticamente.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
