import type { Hypothesis } from "@shared/types/memory";
import { ConfidenceBadge, HypothesisStatusBadge } from "@/components/ui/badge";

export function HypothesisCard({ hypothesis }: { hypothesis: Hypothesis }) {
  const isRuledOut = hypothesis.status === "ruled_out";
  const isConfirmed = hypothesis.status === "confirmed_root_cause";

  return (
    <div
      className={`rounded-md border p-3 space-y-2.5 ${
        isConfirmed
          ? "border-confidence-high/40 bg-confidence-high/5"
          : isRuledOut
            ? "border-border-subtle bg-bg-primary/50 opacity-60"
            : "border-border-subtle bg-bg-surface"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {isConfirmed && <span className="text-confidence-high text-sm">&#10003;</span>}
          <h4
            className={`text-xs font-mono font-medium ${isRuledOut ? "line-through text-text-muted" : "text-text-primary"}`}
          >
            {hypothesis.title}
          </h4>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <ConfidenceBadge confidence={hypothesis.confidence} />
          <HypothesisStatusBadge status={hypothesis.status} />
        </div>
      </div>

      {/* Evidence */}
      {hypothesis.supporting_evidence.length > 0 && (
        <div className="space-y-1">
          <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
            Supporting
          </span>
          <ul className="space-y-0.5">
            {hypothesis.supporting_evidence.map((e, i) => (
              <li key={i} className="flex gap-1.5 text-xs text-text-secondary">
                <span className="text-confidence-high shrink-0 mt-0.5">+</span>
                <span>{e}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {hypothesis.counter_evidence.length > 0 && (
        <div className="space-y-1">
          <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
            Counter
          </span>
          <ul className="space-y-0.5">
            {hypothesis.counter_evidence.map((e, i) => (
              <li key={i} className="flex gap-1.5 text-xs text-text-secondary">
                <span className="text-confidence-low shrink-0 mt-0.5">-</span>
                <span>{e}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Ruled out reason */}
      {isRuledOut && hypothesis.ruled_out_reason && (
        <div className="rounded bg-bg-elevated px-2.5 py-2 text-xs text-text-muted border border-border-subtle">
          <span className="font-mono font-medium">Ruled out:</span> {hypothesis.ruled_out_reason}
        </div>
      )}
    </div>
  );
}
