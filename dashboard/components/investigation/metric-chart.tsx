"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";
import type { DataPoint } from "@/types/metrics";

interface Series {
  key: string;
  color: string;
  label?: string;
}

interface MetricChartProps {
  title: string;
  data: Record<string, unknown>[];
  series: Series[];
  formatValue: (v: number) => string;
  variant?: "area" | "bar";
}

function CustomTooltip({
  active,
  payload,
  label,
  formatValue,
  series,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string }>;
  label?: string;
  formatValue: (v: number) => string;
  series: Series[];
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded border border-border-subtle bg-bg-elevated px-2 py-1.5 text-[10px] font-mono shadow-lg">
      <div className="text-text-muted mb-0.5">{label}</div>
      {payload.map((p) => {
        const s = series.find((s) => s.key === p.dataKey);
        return (
          <div key={p.dataKey} className="text-text-primary flex items-center gap-1.5">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: s?.color }}
            />
            {s?.label && <span className="text-text-muted">{s.label}:</span>}
            <span>{formatValue(p.value)}</span>
          </div>
        );
      })}
    </div>
  );
}

export function MetricChart({
  title,
  data,
  series,
  formatValue,
  variant = "area",
}: MetricChartProps) {
  const latestValues = series.map((s) => {
    if (data.length === 0) return null;
    const last = data[data.length - 1];
    const v = last[s.key];
    return typeof v === "number" ? v : null;
  });

  const hasData = data.length > 0;

  return (
    <div className="rounded-md border border-border-subtle bg-bg-surface p-2.5 space-y-1">
      {/* Header: title + current values */}
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-mono font-medium text-text-muted uppercase tracking-wider">
          {title}
        </span>
        <div className="flex items-baseline gap-2">
          {series.map((s, i) => (
            <span key={s.key} className="text-xs font-mono font-medium" style={{ color: s.color }}>
              {latestValues[i] !== null ? formatValue(latestValues[i]!) : "—"}
              {s.label && (
                <span className="text-[9px] text-text-muted ml-0.5">{s.label}</span>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Chart */}
      {hasData ? (
        <ResponsiveContainer width="100%" height={64}>
          {variant === "bar" ? (
            <BarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <XAxis
                dataKey="time"
                tick={{ fontSize: 9, fill: "var(--text-muted)" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis hide />
              <Tooltip
                content={
                  <CustomTooltip formatValue={formatValue} series={series} />
                }
              />
              {series.map((s) => (
                <Bar key={s.key} dataKey={s.key} fill={s.color} opacity={0.7} radius={[1, 1, 0, 0]} />
              ))}
            </BarChart>
          ) : (
            <AreaChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <defs>
                {series.map((s) => (
                  <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={s.color} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={s.color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <XAxis
                dataKey="time"
                tick={{ fontSize: 9, fill: "var(--text-muted)" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis hide />
              <Tooltip
                content={
                  <CustomTooltip formatValue={formatValue} series={series} />
                }
              />
              {series.map((s) => (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  stroke={s.color}
                  strokeWidth={1.5}
                  fill={`url(#grad-${s.key})`}
                />
              ))}
            </AreaChart>
          )}
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-[64px]">
          <span className="text-[10px] font-mono text-text-muted">No data</span>
        </div>
      )}
    </div>
  );
}
