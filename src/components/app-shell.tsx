"use client";

import { useState } from "react";
import { Shield, FileSearch } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandBiddingClient } from "@/components/report-client";
import { ResumoTratativaClient } from "@/components/resumo-tratativa-client";

type Tab = "relatorio" | "resumo";

const TABS: { id: Tab; label: string; icon: React.ElementType; desc: string }[] = [
  {
    id: "relatorio",
    label: "Relatório Brand Bidding",
    icon: Shield,
    desc: "Gerar PDF do relatório",
  },
  {
    id: "resumo",
    label: "Resumo de Tratativa",
    icon: FileSearch,
    desc: "Resumo via Pipedrive",
  },
];

export function AppShell() {
  const [activeTab, setActiveTab] = useState<Tab>("relatorio");

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Top navigation */}
      <nav className="border-b border-border/60 bg-white px-4 shrink-0">
        <div className="max-w-5xl mx-auto flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-all",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeTab === "relatorio" && <BrandBiddingClient />}
        {activeTab === "resumo" && <ResumoTratativaClient />}
      </div>
    </div>
  );
}
