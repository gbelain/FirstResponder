/**
 * Agent core — agentic loop for FirstResponder
 *
 * Wires Claude (via Anthropic SDK) to memory tools and MCP tools.
 * Manages conversation history and tool dispatch.
 * Uses streaming for real-time text output.
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  MessageParam,
  ToolResultBlockParam,
  Tool,
} from "@anthropic-ai/sdk/resources/messages.js";
import { memoryTools, executeMemoryTool } from "../tools/memory-tools.js";
import { getMcpTools, executeMcpTool, closeMcpClient } from "../mcp/index.js";
import { SYSTEM_PROMPT } from "./prompt.js";

const MODEL = "claude-sonnet-4-5-20250929";
const MAX_TOKENS = 8096;

/**
 * Event handlers for observing agent activity.
 * All callbacks are optional — the agent works without them.
 */
export interface AgentEventHandlers {
  /** Called with each text token as it streams in. */
  onText?: (text: string) => void;
  /** Called when a tool call starts (before execution). */
  onToolStart?: (name: string, input: Record<string, unknown>) => void;
  /** Called when a tool call completes. */
  onToolEnd?: (name: string, result: unknown, isError: boolean) => void;
}

// --- State ---
let client: Anthropic;
let allTools: Tool[] = [];
const memoryToolNames = new Set(memoryTools.map((t) => t.name));
const conversationHistory: MessageParam[] = [];

// --- Public API ---

/**
 * Initialize the agent: create Anthropic client, connect MCP, build tool list.
 * Returns the count of tools loaded.
 */
export async function initAgent(): Promise<{
  memoryToolCount: number;
  mcpToolCount: number;
}> {
  client = new Anthropic();
  const mcpTools = await getMcpTools();
  allTools = [...memoryTools, ...mcpTools];
  return { memoryToolCount: memoryTools.length, mcpToolCount: mcpTools.length };
}

/**
 * Send a user message and run the agentic loop until Claude produces a final response.
 * Streams text tokens via the onText callback as they arrive.
 * Returns the full text of Claude's response.
 */
export async function sendMessage(
  userMessage: string,
  events?: AgentEventHandlers
): Promise<string> {
  conversationHistory.push({ role: "user", content: userMessage });

  while (true) {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      tools: allTools,
      messages: conversationHistory,
    });

    // Stream text deltas as they arrive
    stream.on("text", (text) => events?.onText?.(text));

    // Wait for the complete message
    const response = await stream.finalMessage();

    conversationHistory.push({ role: "assistant", content: response.content });

    // Agent finished — return accumulated text
    if (response.stop_reason === "end_turn") {
      return extractText(response.content);
    }

    // Agent wants to call tools — execute them and continue the loop
    if (response.stop_reason === "tool_use") {
      const toolResults: ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type === "tool_use") {
          const input = block.input as Record<string, unknown>;

          events?.onToolStart?.(block.name, input);

          const result = await executeTool(block.name, input);
          const isError =
            typeof result === "object" &&
            result !== null &&
            "error" in result;

          events?.onToolEnd?.(block.name, result, isError);

          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content:
              typeof result === "string" ? result : JSON.stringify(result),
          });
        }
      }

      // Tool results are sent as role:"user" — this is the Anthropic Messages API
      // convention. The API requires alternating user/assistant roles, and tool
      // results are returned to the model in a user message.
      conversationHistory.push({ role: "user", content: toolResults });
      continue;
    }

    // Safety: max_tokens — return what we have with a truncation notice
    if (response.stop_reason === "max_tokens") {
      return (
        extractText(response.content) +
        "\n\n[Response truncated due to length]"
      );
    }

    // Fallback for any other stop_reason
    return extractText(response.content);
  }
}

/**
 * Shut down the agent: close MCP client.
 */
export async function shutdownAgent(): Promise<void> {
  await closeMcpClient();
}

/**
 * Get the full conversation history (for debugging).
 */
export function getConversationHistory(): MessageParam[] {
  return conversationHistory;
}

// --- Internal Helpers ---

/**
 * Route a tool call to either the memory layer or MCP server.
 * Errors are caught and returned as objects so Claude can reason about them.
 */
async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<unknown> {
  try {
    if (memoryToolNames.has(toolName)) {
      return await executeMemoryTool(toolName, toolInput);
    }
    return await executeMcpTool(toolName, toolInput);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { error: message };
  }
}

/**
 * Extract text content from a response content block array.
 */
function extractText(
  content: Anthropic.Messages.ContentBlock[]
): string {
  return content
    .filter(
      (block): block is Anthropic.Messages.TextBlock => block.type === "text"
    )
    .map((block) => block.text)
    .join("\n");
}
