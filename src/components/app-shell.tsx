"use client";

import { useState } from "react";
import { Shield, FileSearch, Menu, X, Presentation } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandBiddingClient } from "@/components/brand-bidding-client";
import { ResumoTratativaClient } from "@/components/resumo-tratativa-client";
import { ApresentacaoMensalClient } from "@/components/apresentacao-client";

type Tab = "relatorio" | "resumo" | "apresentacao";

const TABS: { id: Tab; label: string; icon: React.ElementType; desc: string }[] = [
  { id: "relatorio", label: "Relatório Brand Bidding", icon: Shield, desc: "Gerar PDF do relatório" },
  { id: "resumo", label: "Resumo de Tratativa", icon: FileSearch, desc: "Resumo via Pipefy" },
  { id: "apresentacao", label: "Apresentação Mensal", icon: Presentation, desc: "Gerar PPT mensal" },
];

export function AppShell() {
  const [activeTab, setActiveTab] = useState<Tab>("relatorio");
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeTabInfo = TABS.find((t) => t.id === activeTab)!;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 flex flex-col border-r transition-transform md:translate-x-0 md:static md:flex",
          "bg-sidebar text-sidebar-foreground border-sidebar-border",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="px-5 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald flex items-center justify-center shrink-0 shadow-sm">
              <Shield size={18} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight tracking-tight">Lumus</h1>
              <p className="text-[10px] uppercase tracking-widest text-white/50 font-medium">
                Branddi Monitor
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/40">
            Ferramentas
          </p>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setMobileOpen(false);
                }}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-lg flex items-start gap-3 transition-all",
                  isActive
                    ? "bg-sidebar-active text-white shadow-sm"
                    : "text-white/70 hover:bg-sidebar-hover hover:text-white"
                )}
              >
                <Icon size={16} className="mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight">{tab.label}</p>
                  <p className="text-[11px] text-white/50 mt-0.5 leading-tight">{tab.desc}</p>
                </div>
              </button>
            );
          })}
        </nav>

        <div className="px-5 py-4 border-t border-sidebar-border">
          <p className="text-[10px] text-white/40 leading-relaxed">
            v1.0 · Branddi Monitor
            <br />
            Suite de produtividade interna
          </p>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div onClick={() => setMobileOpen(false)} className="fixed inset-0 bg-black/40 z-30 md:hidden" />
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-border flex items-center px-4 md:px-6 gap-3 shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div className="flex items-center gap-2">
            <activeTabInfo.icon size={16} className="text-primary" />
            <h2 className="text-sm font-semibold text-foreground">{activeTabInfo.label}</h2>
            <span className="hidden sm:inline-block text-xs text-muted-foreground">
              · {activeTabInfo.desc}
            </span>
          </div>
        </header>

        <div className="flex-1 flex flex-col overflow-hidden">
          {activeTab === "relatorio" && <BrandBiddingClient />}
          {activeTab === "resumo" && <ResumoTratativaClient />}
          {activeTab === "apresentacao" && <ApresentacaoMensalClient />}
        </div>
      </main>
    </div>
  );
}
