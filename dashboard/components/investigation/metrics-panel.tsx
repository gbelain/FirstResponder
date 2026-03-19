"use client";

import { useState, useEffect } from "react";
import { useMetrics } from "@/hooks/use-metrics";
import { MetricChart } from "./metric-chart";

const STORAGE_KEY = "firstresponder-metrics-collapsed";

const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`;
const fmtCores = (v: number) => (v >= 0.01 ? `${v.toFixed(3)}` : `${(v * 1000).toFixed(1)}m`);
const fmtBytes = (v: number) => {
  if (v >= 1_073_741_824) return `${(v / 1_073_741_824).toFixed(1)} Gi`;
  if (v >= 1_048_576) return `${(v / 1_048_576).toFixed(0)} Mi`;
  return `${(v / 1024).toFixed(0)} Ki`;
};
const fmtInt = (v: number) => `${Math.round(v)}`;
const fmtUptime = (v: number) => {
  const h = Math.floor(v / 3600);
  const m = Math.floor((v % 3600) / 60);
  return h > 0 ? `${h}h${m}m` : `${m}m`;
};

export default function MetricsPanel({ incidentId }: { incidentId: string | null }) {
  const { data: metricsData, isLoading } = useMetrics(incidentId);
  const [collapsed, setCollapsed] = useState(true);

  // Persist collapse state
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) setCollapsed(stored === "true");
    } catch {}
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {}
  };

  if (!incidentId || incidentId === "new") return null;

  const services = metricsData ? Object.keys(metricsData) : [];
  const hasMetrics = services.length > 0;

  return (
    <div className="border-b border-border-subtle">
      {/* Header */}
      <button
        onClick={toggleCollapsed}
        className="flex w-full items-center justify-between px-4 py-2 text-[10px] font-mono font-medium text-text-muted uppercase tracking-wider hover:text-text-secondary transition-colors"
      >
        <span className="flex items-center gap-1.5">
          Metrics
          {isLoading && (
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
          )}
        </span>
        <span className="text-[9px]">{collapsed ? "▸" : "▾"}</span>
      </button>

      {/* Charts grid */}
      {!collapsed && (
        <div className="px-4 pb-3 space-y-3">
          {!hasMetrics && !isLoading && (
            <div className="py-3 text-center text-[10px] font-mono text-text-muted">
              No metrics available
            </div>
          )}

          {isLoading && !hasMetrics && (
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[92px] rounded-md border border-border-subtle bg-bg-surface animate-pulse"
                />
              ))}
            </div>
          )}

          {services.map((service) => {
            const m = metricsData![service];

            return (
              <div key={service}>
                {services.length > 1 && (
                  <div className="text-[9px] font-mono text-text-muted uppercase tracking-wider mb-1.5">
                    {service}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <MetricChart
                    title="CPU Utilization"
                    data={m.cpuUtilization.map((d) => ({ time: d.time, value: d.value }))}
                    series={[{ key: "value", color: "var(--metric-cpu)" }]}
                    formatValue={fmtPct}
                  />
                  <MetricChart
                    title="CPU Cores Used"
                    data={m.cpuCores.map((d) => ({ time: d.time, value: d.value }))}
                    series={[{ key: "value", color: "var(--metric-cpu)" }]}
                    formatValue={fmtCores}
                  />
                  <MetricChart
                    title="Memory Utilization"
                    data={m.memoryUtilization.map((d) => ({ time: d.time, value: d.value }))}
                    series={[{ key: "value", color: "var(--metric-memory)" }]}
                    formatValue={fmtPct}
                  />
                  <MetricChart
                    title="Memory Used"
                    data={m.memoryUsed.map((d) => ({ time: d.time, value: d.value }))}
                    series={[{ key: "value", color: "var(--metric-memory)" }]}
                    formatValue={fmtBytes}
                  />
                  <MetricChart
                    title="Pod Restarts"
                    data={m.podRestarts.map((d) => ({ time: d.time, value: d.value }))}
                    series={[{ key: "value", color: "var(--metric-restarts)" }]}
                    formatValue={fmtInt}
                    variant="bar"
                  />
                  <MetricChart
                    title="Uptime"
                    data={m.uptime.map((d) => ({ time: d.time, value: d.value }))}
                    series={[{ key: "value", color: "var(--metric-request)" }]}
                    formatValue={fmtUptime}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
