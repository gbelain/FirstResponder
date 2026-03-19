"use client";

import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import { useRef, useEffect, useCallback, useState, useMemo } from "react";
import Link from "next/link";
import { Message } from "./message";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const STORAGE_PREFIX = "fr-chat-";

function loadMessages(incidentId: string): UIMessage[] | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const stored = sessionStorage.getItem(STORAGE_PREFIX + incidentId);
    if (stored) return JSON.parse(stored);
  } catch {}
  return undefined;
}

function saveMessages(incidentId: string, messages: UIMessage[]) {
  try {
    sessionStorage.setItem(STORAGE_PREFIX + incidentId, JSON.stringify(messages));
  } catch {}
}

interface ChatPanelProps {
  incidentId: string;
  userName: string;
  onIncidentCreated?: (incidentId: string) => void;
}

export function ChatPanel({ incidentId, userName, onIncidentCreated }: ChatPanelProps) {
  const [hasMounted, setHasMounted] = useState(false);

  const transport = useMemo(
    () => new DefaultChatTransport({ body: { incidentId, userName } }),
    [incidentId, userName]
  );

  const { messages, sendMessage, status, setMessages } = useChat({
    transport,
  });

  // Restore messages from sessionStorage after mount to avoid hydration mismatch
  useEffect(() => {
    if (!hasMounted) {
      const stored = loadMessages(incidentId);
      if (stored && stored.length > 0) {
        setMessages(stored);
      }
      setHasMounted(true);
    }
  }, [hasMounted, incidentId, setMessages]);

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isStreaming = status === "streaming" || status === "submitted";

  // Persist messages to sessionStorage
  useEffect(() => {
    if (messages.length > 0) {
      saveMessages(incidentId, messages);
    }
  }, [messages, incidentId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Detect create_incident tool call to extract incident ID
  useEffect(() => {
    if (!onIncidentCreated) return;
    for (const msg of messages) {
      for (const part of msg.parts) {
        if (part.type === "tool-create_incident") {
          const toolPart = part as Record<string, unknown>;
          if (toolPart.state === "output-available") {
            const output = toolPart.output as { incident_id?: string } | undefined;
            if (output?.incident_id) {
              // Also migrate the stored messages to the new incident ID key
              saveMessages(output.incident_id, messages);
              onIncidentCreated(output.incident_id);
            }
          }
        }
      }
    }
  }, [messages, onIncidentCreated]);

  const doSend = useCallback(() => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");
    sendMessage({ text });
  }, [input, isStreaming, sendMessage]);

  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      doSend();
    },
    [doSend]
  );

  // Cmd+Enter / Ctrl+Enter to send from anywhere
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        doSend();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [doSend]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="text-text-muted hover:text-text-primary transition-colors"
            title="Back to investigations"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
            </svg>
          </Link>
          <div
            className={`h-2 w-2 rounded-full ${
              isStreaming
                ? "bg-accent animate-pulse"
                : status === "error"
                  ? "bg-confidence-low"
                  : "bg-confidence-high"
            }`}
            title={isStreaming ? "Agent working" : status === "error" ? "Error" : "Ready"}
          />
          <h2 className="text-sm font-mono font-medium text-text-secondary tracking-wider uppercase">
            Investigation Chat
          </h2>
        </div>
        <ThemeToggle />
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-text-muted text-sm font-mono">
              Send a message to start investigating...
            </p>
          </div>
        )}
        {messages.map((message) => (
          <Message key={message.id} message={message} />
        ))}
        {isStreaming && messages.length > 0 && messages[messages.length - 1].role === "user" && (
          <div className="flex items-center gap-2 text-text-muted text-xs font-mono">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
            agent working...
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={onSubmit} className="border-t border-border-subtle p-4">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe the incident or ask a question..."
            className="flex-1 rounded-md border border-border-subtle bg-bg-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-dim focus:outline-none focus:ring-1 focus:ring-accent-dim font-mono"
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="rounded-md bg-accent/15 border border-accent/30 px-4 py-2.5 text-sm font-mono font-medium text-accent hover:bg-accent/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
