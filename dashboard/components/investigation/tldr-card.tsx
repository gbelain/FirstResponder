import type { TLDR } from "@/types/memory";

export function TLDRCard({ tldr }: { tldr: TLDR }) {
  const updatedAgo = getTimeAgo(tldr.last_updated);

  return (
    <div className="rounded-md border border-border-subtle bg-bg-surface p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-mono font-medium text-text-muted uppercase tracking-wider">
          TLDR
        </h3>
        <span className="text-[10px] font-mono text-text-muted">{updatedAgo}</span>
      </div>
      <p className="text-sm leading-relaxed text-text-primary">{tldr.summary}</p>
    </div>
  );
}

function getTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}
