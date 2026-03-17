"use client";

import type { UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import { ToolCall } from "./tool-call";

interface MessageProps {
  message: UIMessage;
}

function getToolNameFromType(type: string): string {
  return type.startsWith("tool-") ? type.slice(5) : type;
}

export function Message({ message }: MessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      {/* Avatar */}
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-mono font-bold ${
          isUser
            ? "bg-accent/15 text-accent border border-accent/30"
            : "bg-bg-elevated text-text-secondary border border-border-subtle"
        }`}
      >
        {isUser ? "U" : "FR"}
      </div>

      {/* Content */}
      <div className={`flex-1 min-w-0 space-y-1 ${isUser ? "text-right" : ""}`}>
        {message.parts.map((part, i) => {
          if (part.type === "text") {
            return (
              <div
                key={i}
                className={`inline-block rounded-lg px-3.5 py-2.5 text-sm leading-relaxed ${
                  isUser
                    ? "bg-accent/10 text-text-primary border border-accent/20"
                    : "text-text-primary"
                }`}
              >
                <div className="chat-markdown">
                  <ReactMarkdown>{part.text}</ReactMarkdown>
                </div>
              </div>
            );
          }

          // Tool invocation parts have type "tool-{name}"
          if (part.type.startsWith("tool-")) {
            const toolName = getToolNameFromType(part.type);
            const toolPart = part as Record<string, unknown>;
            const state = toolPart.state as string;
            const input = toolPart.input as Record<string, unknown> | undefined;
            const output = toolPart.output as unknown;

            return (
              <ToolCall
                key={i}
                toolName={toolName}
                args={input ?? {}}
                result={output}
                state={state === "output-available" ? "result" : state === "output-error" ? "error" : "loading"}
              />
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
