"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Loader2, ImageIcon, X, RefreshCw, Check, ClipboardCopy } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

export interface AnalysisOptions {
  exemplo1: string;
  exemplo2: string;
}

interface ChartSectionProps {
  slot: "agressores" | "heatmap";
  uploadLabel: string;
  preview: string;
  analysisText: string;
  options: AnalysisOptions | null;
  loading: boolean;
  /** Se false, o gráfico é desativado e não entra no PPT */
  enabled?: boolean;
  onToggle?: () => void;
  onFile: (file: File) => void;
  onClear: () => void;
  onSelectAnalysis: (text: string) => void;
  onEditAnalysis: (text: string) => void;
  onRegenerate: () => void;
}

export function ChartSection({
  slot,
  uploadLabel,
  preview,
  analysisText,
  options,
  loading,
  enabled = true,
  onToggle,
  onFile,
  onClear,
  onSelectAnalysis,
  onEditAnalysis,
  onRegenerate,
}: ChartSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  function handleFile(file: File | null | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Apenas imagens (PNG, JPG, etc.)");
      return;
    }
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
          if (file) {
            e.preventDefault();
            handleFile(file);
            toast.success("Imagem colada!");
            return;
          }
        }
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused]);

  return (
    <div className="space-y-3">
      {/* ─── HEADER COM TOGGLE ─── */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-white/50">{uploadLabel}</p>
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all",
              enabled
                ? "bg-cyan-500/20 border-cyan-400/40 text-cyan-300 hover:bg-cyan-500/30"
                : "bg-white/5 border-white/10 text-white/25 hover:border-white/20"
            )}
            title={enabled ? "Desativar este gráfico" : "Ativar este gráfico"}
          >
            <div className={cn(
              "w-1.5 h-1.5 rounded-full transition-all",
              enabled ? "bg-cyan-400" : "bg-white/20"
            )} />
            {enabled ? "Incluir no PPT" : "Não incluir"}
          </button>
        )}
      </div>

      {/* ─── CONTEÚDO (escondido se desativado) ─── */}
      <div className={cn("transition-all", !enabled && "opacity-30 pointer-events-none select-none")}>

      {/* ─── CONTAINER DE UPLOAD (imagem com borda ciano, centralizada) ─── */}
      <div className="mb-3">
        <div
          ref={dropRef}
          tabIndex={0}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onClick={() => {
            setIsFocused(true);
            if (!preview) inputRef.current?.click();
          }}
          onDrop={(e) => {
            e.preventDefault();
            handleFile(e.dataTransfer.files[0]);
          }}
          onDragOver={(e) => e.preventDefault()}
          className={cn(
            "relative rounded-xl border-2 transition-all overflow-hidden outline-none",
            preview
              ? "border-cyan-400/50 bg-[#0a2235] cursor-default"
              : "border-dashed border-white/20 hover:border-cyan-400/50 hover:bg-cyan-500/5 cursor-pointer",
            isFocused && !preview && "ring-2 ring-cyan-400/20 border-cyan-400/60 bg-cyan-500/5"
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />

          {preview ? (
            <>
              {/* Imagem 100% largura, sem corte, proporcional — igual ao modelo */}
              <div className="w-full p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt={uploadLabel}
                  className="w-full h-auto object-contain rounded-lg"
                  style={{ display: "block" }}
                />
              </div>

              {/* Overlay de carregamento */}
              {loading && (
                <div className="absolute inset-0 bg-[#061520]/90 flex flex-col items-center justify-center gap-3 backdrop-blur-sm">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
                    <Sparkles size={16} className="text-cyan-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <p className="text-white text-sm font-medium">Gerando análise...</p>
                  <p className="text-white/50 text-xs">Aguarde um momento</p>
                </div>
              )}

              {!loading && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onClear(); }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-500/80 transition-colors"
                  title="Remover imagem"
                >
                  <X size={12} />
                </button>
              )}

              {/* Badge de análise gerada */}
              {!loading && options && (
                <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-cyan-500/20 border border-cyan-400/30 rounded-full px-2 py-1">
                  <Check size={10} className="text-cyan-400" />
                  <span className="text-[10px] font-semibold text-cyan-300 uppercase tracking-wide">
                    IA gerada
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-8">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                <ImageIcon size={18} className="text-white/30" />
              </div>
              <p className="text-sm font-medium text-white/50">
                Clique, arraste ou cole (Ctrl+V)
              </p>
              <p className="text-[11px] text-white/25 flex items-center gap-1">
                <ClipboardCopy size={10} />
                Cole um print da área de transferência
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ─── ANÁLISE EMBAIXO DO GRÁFICO (igual ao modelo) ─── */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles size={13} className="text-cyan-400" />
            <p className="text-[11px] font-semibold text-cyan-300 uppercase tracking-wide">
              Análise estratégica
            </p>
            {loading && (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-cyan-400 font-medium">
                <Loader2 size={11} className="animate-spin" />
                Gerando...
              </span>
            )}
          </div>
          {options && !loading && (
            <button
              type="button"
              onClick={onRegenerate}
              className="flex items-center gap-1.5 text-xs font-medium text-white/40 hover:text-cyan-300 transition-colors"
            >
              <RefreshCw size={11} />
              Regenerar
            </button>
          )}
        </div>

        {/* Textarea da análise */}
        <textarea
          value={analysisText}
          onChange={(e) => onEditAnalysis(e.target.value)}
          rows={slot === "heatmap" ? 2 : 3}
          placeholder={
            preview
              ? "A análise aparecerá aqui..."
              : "Cole o gráfico acima para gerar análise com IA."
          }
          className="w-full rounded-lg border border-white/10 bg-white text-gray-900 placeholder:text-gray-400 px-3 py-2 text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-cyan-400/20 focus:border-cyan-400/40"
          disabled={loading}
        />

        {/* Picker das 2 opções */}
        {options && !loading && (
          <div className="mt-3">
            <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wide mb-2">
              Trocar por outra opção da IA
            </p>
            <div className="grid grid-cols-1 gap-2">
              {(["exemplo1", "exemplo2"] as const).map((key, idx) => {
                const text = options[key];
                const isSelected = analysisText.trim() === text.trim();
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onSelectAnalysis(text)}
                    className={cn(
                      "text-left rounded-lg border p-2.5 transition-all text-xs leading-relaxed",
                      isSelected
                        ? "border-cyan-400/50 bg-cyan-500/10 ring-1 ring-cyan-400/20"
                        : "border-white/10 bg-white/5 hover:border-cyan-400/30 hover:bg-cyan-500/5"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400/70">
                        Opção {idx + 1}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] font-semibold text-cyan-400 flex items-center gap-1">
                          <Check size={10} /> Em uso
                        </span>
                      )}
                    </div>
                    <p className="text-white/70">{text}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      </div>
    </div>
  );
}
