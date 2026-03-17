import type { TimelineEvent } from "@shared/types/memory";

const sourceIcons: Record<string, string> = {
  logs: "\u25b6", // terminal-like
  user: "\u25cf", // dot
  agent: "\u25c6", // diamond
  metrics: "\u25a0", // square
};

export function Timeline({ events }: { events: TimelineEvent[] }) {
  // Most recent first
  const sorted = [...events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  if (sorted.length === 0) {
    return (
      <div className="py-6 text-center text-xs font-mono text-text-muted">
        No timeline events yet
      </div>
    );
  }

  return (
    <div className="relative space-y-0">
      {sorted.map((event, i) => {
        const time = new Date(event.timestamp);
        const timeStr = time.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "UTC",
        });
        const isLast = i === sorted.length - 1;

        return (
          <div key={`${event.timestamp}-${i}`} className="flex gap-3 group">
            {/* Timestamp */}
            <div className="w-12 shrink-0 text-right">
              <span className="text-[10px] font-mono text-text-muted leading-6">{timeStr}</span>
            </div>

            {/* Line + dot */}
            <div className="flex flex-col items-center">
              <div className="flex h-6 w-6 items-center justify-center">
                <span className="text-xs text-accent">{sourceIcons[event.source] || "\u25cf"}</span>
              </div>
              {!isLast && <div className="w-px flex-1 bg-border-subtle min-h-[16px]" />}
            </div>

            {/* Content */}
            <div className="flex-1 pb-4 min-w-0">
              <p className="text-xs font-mono font-medium text-text-primary leading-6">
                {event.event}
              </p>
              <p className="text-xs text-text-secondary leading-relaxed mt-0.5">{event.details}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
