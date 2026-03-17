"use client";

import { useState } from "react";
import { ToolBadge } from "@/components/ui/badge";

const MEMORY_TOOL_NAMES = new Set([
  "create_incident",
  "get_incident",
  "list_incidents",
  "add_timeline_event",
  "propose_hypothesis",
  "update_hypothesis",
  "rule_out_hypothesis",
  "confirm_root_cause",
  "add_finding",
  "update_tldr",
  "get_hypotheses",
  "get_timeline",
]);

interface ToolCallProps {
  toolName: string;
  args: Record<string, unknown>;
  result?: unknown;
  state: "loading" | "result" | "error";
}

export function ToolCall({ toolName, args, result, state }: ToolCallProps) {
  const [expanded, setExpanded] = useState(false);
  const isMemoryTool = MEMORY_TOOL_NAMES.has(toolName);
  const isLoading = state === "loading";
  const isError = state === "error";

  return (
    <div className="my-1.5 rounded-md border border-border-subtle bg-bg-primary/50 font-mono text-xs">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-bg-elevated/50 transition-colors"
      >
        <ToolBadge isMemoryTool={isMemoryTool} />
        <span className="text-text-secondary truncate">{formatToolName(toolName)}</span>
        <span className="ml-auto flex items-center gap-1.5">
          {isLoading && (
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent" />
          )}
          {!isLoading && !isError && (
            <span className="text-confidence-high">ok</span>
          )}
          {isError && <span className="text-confidence-low">err</span>}
          <svg
            className={`h-3 w-3 text-text-muted transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {expanded && (
        <div className="border-t border-border-subtle px-3 py-2 space-y-2">
          <div>
            <span className="text-text-muted">input:</span>
            <pre className="mt-1 overflow-x-auto text-text-secondary whitespace-pre-wrap break-all">
              {JSON.stringify(args, null, 2)}
            </pre>
          </div>
          {state === "result" && result !== undefined && (
            <div>
              <span className="text-text-muted">result:</span>
              <pre className="mt-1 overflow-x-auto text-text-secondary whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
                {truncateResult(JSON.stringify(result, null, 2))}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatToolName(name: string): string {
  return name.replace(/_/g, " ");
}

function truncateResult(str: string, maxLen = 2000): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + "\n... (truncated)";
}
