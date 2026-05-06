"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { FileSearch, Loader2, ClipboardCopy, Check, Eye, EyeOff, RotateCcw } from "lucide-react";

interface ResumoResult {
  nomeAgressor: string;
  etiquetaTopLeilao: "Sim" | "Não";
  notificacoesEnviadas: number;
  ultimaComunicacao: string | null;
  retorno: "Sim" | "Não";
  observacao: string;
}

function CheckIcon() {
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-white font-bold text-base" style={{ background: "#2abfbf" }}>✓</span>
  );
}

function XIcon() {
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-400 text-white font-bold text-base">✗</span>
  );
}

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

  function formatNotif(n: number): string {
    return n > 10 ? "+10" : String(n);
  }

  async function copyTable() {
    if (!result) return;

    const leilao = result.etiquetaTopLeilao === "Sim";
    const resposta = result.retorno === "Sim";
    const notif = formatNotif(result.notificacoesEnviadas);
    const ultima = result.ultimaComunicacao ?? "—";

    const th = (text: string) =>
      `<th style="padding:8px 12px;border:1px solid #cbd5e1;background:#0d3349;color:white;font-size:12px;white-space:nowrap;">${text}</th>`;
    const td = (text: string, color?: string) =>
      `<td style="padding:8px 12px;border:1px solid #cbd5e1;font-size:12px;vertical-align:middle;${color ? `color:${color};font-weight:bold;` : ""}">${text}</td>`;

    const html = `<table style="border-collapse:collapse;font-family:Arial,sans-serif;">
  <thead><tr>
    ${th("Agressor")}${th("Termos atingidos")}${th("Concorrente (Leilão)")}${th("Notificações Enviadas")}${th("Última Notificação")}${th("Resposta")}${th("Observação")}
  </tr></thead>
  <tbody><tr>
    ${td(result.nomeAgressor)}
    ${td("-")}
    ${td(leilao ? "✓" : "✗", leilao ? "#16a34a" : "#dc2626")}
    ${td(notif)}
    ${td(ultima)}
    ${td(resposta ? "✓" : "✗", resposta ? "#16a34a" : "#dc2626")}
    ${td(result.observacao)}
  </tr></tbody>
</table>`;

    const plain = [
      "Agressor\tTermos atingidos\tConcorrente (Leilão)\tNotificações Enviadas\tÚltima Notificação\tResposta\tObservação",
      `${result.nomeAgressor}\t-\t${leilao ? "✓" : "✗"}\t${notif}\t${ultima}\t${resposta ? "✓" : "✗"}\t${result.observacao}`,
    ].join("\n");

    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([plain], { type: "text/plain" }),
        }),
      ]);
      setCopied(true);
      toast.success("Tabela copiada! Cole no Google Slides.");
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
        <div className="max-w-5xl mx-auto space-y-5">

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

          {/* Result table */}
          {result && (
            <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
              {/* Actions bar */}
              <div className="px-5 py-3 flex items-center justify-between border-b border-border bg-slate-50">
                <p className="text-xs text-muted-foreground">
                  Preencha os <strong>Termos atingidos</strong> e clique em <strong>Copiar tabela</strong> para colar no Google Slides.
                </p>
                <div className="flex gap-2 shrink-0 ml-4">
                  <button
                    onClick={reset}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-white transition-all border border-border"
                  >
                    <RotateCcw size={11} />
                    Nova consulta
                  </button>
                  <button
                    onClick={copyTable}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
                    style={{ background: "#2abfbf" }}
                  >
                    {copied ? <Check size={11} /> : <ClipboardCopy size={11} />}
                    {copied ? "Copiado!" : "Copiar tabela"}
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b-2" style={{ borderColor: "#e2e8f0" }}>
                      {["Agressor", "Termos atingidos", "Concorrente\n(Leilão)", "Notificações\nEnviadas", "Última\nNotificação", "Resposta", "Observação"].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-4 text-center text-sm font-semibold whitespace-pre-line"
                          style={{ color: "#2abfbf" }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="px-4 py-5 text-center text-sm text-foreground">{result.nomeAgressor}</td>
                      <td className="px-4 py-5 text-center text-foreground">-</td>
                      <td className="px-4 py-5 text-center">
                        {result.etiquetaTopLeilao === "Sim" ? <CheckIcon /> : <XIcon />}
                      </td>
                      <td className="px-4 py-5 text-center font-semibold text-foreground">
                        {formatNotif(result.notificacoesEnviadas)}
                      </td>
                      <td className="px-4 py-5 text-center text-foreground whitespace-nowrap">
                        {result.ultimaComunicacao ?? "—"}
                      </td>
                      <td className="px-4 py-5 text-center">
                        {result.retorno === "Sim" ? <CheckIcon /> : <XIcon />}
                      </td>
                      <td className="px-4 py-5 text-center text-foreground leading-relaxed max-w-xs">
                        <p>{result.observacao}</p>
                        <span className="text-[10px] mt-1 block text-muted-foreground">
                          {result.observacao.length} chars
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
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
