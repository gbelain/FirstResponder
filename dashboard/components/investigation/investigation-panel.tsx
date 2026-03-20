"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type { IncidentMemory } from "@/types/memory";
import { useInvestigation } from "@/hooks/use-investigation";
import { MetadataBar } from "./metadata-bar";
import { TLDRCard } from "./tldr-card";
import { Timeline } from "./timeline";
import { HypothesisCard } from "./hypothesis-card";
import { FindingsList } from "./findings-list";

const MetricsPanel = dynamic(() => import("./metrics-panel"), { ssr: false });

type Tab = "timeline" | "hypotheses" | "findings";

export function InvestigationPanel({ incidentId }: { incidentId: string | null }) {
  const { data: incident, isLoading } = useInvestigation(incidentId);
  const [activeTab, setActiveTab] = useState<Tab>("timeline");

  // Keyboard shortcuts: 1/2/3 to switch tabs (only when not typing in an input)
  useEffect(() => {
    const tabKeys: Record<string, Tab> = { "&": "timeline", "é": "hypotheses", "\"": "findings" };
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      const tab = tabKeys[e.key];
      if (tab) {
        e.preventDefault();
        setActiveTab(tab);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (!incidentId || incidentId === "new") {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b border-border-subtle px-4 py-3">
          <h2 className="text-sm font-mono font-medium text-text-secondary tracking-wider uppercase">
            Investigation
          </h2>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-text-muted text-xs font-mono">
            Start a conversation to begin investigating
          </p>
        </div>
      </div>
    );
  }

  if (isLoading && !incident) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b border-border-subtle px-4 py-3">
          <h2 className="text-sm font-mono font-medium text-text-secondary tracking-wider uppercase">
            Investigation
          </h2>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent" />
        </div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b border-border-subtle px-4 py-3">
          <h2 className="text-sm font-mono font-medium text-text-secondary tracking-wider uppercase">
            Investigation
          </h2>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-text-muted text-xs font-mono">Incident not found</p>
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "timeline", label: "Timeline", count: incident.timeline.length },
    { key: "hypotheses", label: "Hypotheses", count: incident.hypotheses.length },
    { key: "findings", label: "Findings", count: incident.findings.length },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Metadata */}
      <MetadataBar incident={incident} />

      {/* TLDR */}
      <div className="px-4 py-3 border-b border-border-subtle">
        <TLDRCard tldr={incident.tldr} />
      </div>

      {/* Metrics */}
      <MetricsPanel incidentId={incidentId} />

      {/* Tabs */}
      <div className="flex border-b border-border-subtle">
        {tabs.map((tab, i) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-mono font-medium transition-colors ${
              activeTab === tab.key
                ? "text-accent border-b-2 border-accent"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            <kbd className={`text-[9px] px-1 rounded border ${
              activeTab === tab.key
                ? "border-accent/30 text-accent/60"
                : "border-border-subtle text-text-muted/50"
            }`}>{["&", "é", "\""][i]}</kbd>
            {tab.label}
            {tab.count > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                  activeTab === tab.key
                    ? "bg-accent/15 text-accent"
                    : "bg-bg-elevated text-text-muted"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {activeTab === "timeline" && <Timeline events={incident.timeline} />}
        {activeTab === "hypotheses" && (
          <div className="space-y-3">
            {incident.hypotheses.length === 0 ? (
              <div className="py-6 text-center text-xs font-mono text-text-muted">
                No hypotheses proposed yet
              </div>
            ) : (
              incident.hypotheses.map((h) => <HypothesisCard key={h.id} hypothesis={h} />)
            )}
          </div>
        )}
        {activeTab === "findings" && <FindingsList findings={incident.findings} />}
      </div>
    </div>
  );
}
