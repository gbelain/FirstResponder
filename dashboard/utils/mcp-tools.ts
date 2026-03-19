import { experimental_createMCPClient as createMCPClient } from "@ai-sdk/mcp";
import { Experimental_StdioMCPTransport } from "@ai-sdk/mcp/mcp-stdio";

let mcpClient: Awaited<ReturnType<typeof createMCPClient>> | null = null;

async function getMcpClient() {
  if (mcpClient) return mcpClient;

  const transport = new Experimental_StdioMCPTransport({
    command: "npx",
    args: ["-y", "@google-cloud/observability-mcp"],
  });

  mcpClient = await createMCPClient({ transport });
  return mcpClient;
}

export async function loadMcpTools() {
  const client = await getMcpClient();
  return await client.tools();
}

/**
 * Call an MCP tool directly (outside the AI SDK streamText loop).
 * Uses the same singleton MCP client as loadMcpTools.
 */
export async function callMcpTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  try {
    const tools = await loadMcpTools();
    const tool = tools[toolName];
    if (!tool || typeof (tool as Record<string, unknown>).execute !== "function") {
      throw new Error(`MCP tool "${toolName}" not found`);
    }
    return await (tool as unknown as { execute: (args: unknown, opts: unknown) => Promise<unknown> })
      .execute(args, { toolCallId: `direct-${Date.now()}`, messages: [] });
  } catch (error) {
    // Reset client on transport errors so the next call reconnects
    if (
      error instanceof Error &&
      (error.message.includes("connection") ||
        error.message.includes("transport") ||
        error.message.includes("EPIPE"))
    ) {
      mcpClient = null;
    }
    throw error;
  }
}
