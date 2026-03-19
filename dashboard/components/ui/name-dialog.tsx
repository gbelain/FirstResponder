"use client";

import { useState, useCallback } from "react";

interface NameDialogProps {
  onSubmit: (name: string) => void;
}

export function NameDialog({ onSubmit }: NameDialogProps) {
  const [value, setValue] = useState("");

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = value.trim();
      if (trimmed) onSubmit(trimmed);
    },
    [value, onSubmit]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border border-border-subtle bg-bg-primary p-6 shadow-xl space-y-4"
      >
        <h2 className="text-sm font-mono font-bold text-text-primary tracking-wider uppercase">
          Join Investigation
        </h2>
        <p className="text-xs font-mono text-text-muted">
          Enter your name so other investigators can see your contributions.
        </p>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Your name"
          autoFocus
          className="w-full rounded-md border border-border-subtle bg-bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-dim focus:outline-none focus:ring-1 focus:ring-accent-dim font-mono"
        />
        <button
          type="submit"
          disabled={!value.trim()}
          className="w-full rounded-md bg-accent/15 border border-accent/30 px-4 py-2.5 text-sm font-mono font-medium text-accent hover:bg-accent/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Start investigating
        </button>
      </form>
    </div>
  );
}
