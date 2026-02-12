/**
 * MCP client for connecting to google-cloud-observability server
 * Provides tool passthrough to Anthropic SDK format
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { Tool } from "@anthropic-ai/sdk/resources/messages.js";

let mcpClient: Client | null = null;
let mcpTransport: StdioClientTransport | null = null;

/**
 * Get or create the MCP client singleton
 * Connects to google-cloud-observability MCP server via npx
 */
export async function getMcpClient(): Promise<Client> {
  if (mcpClient) return mcpClient;

  mcpTransport = new StdioClientTransport({
    command: "npx",
    args: ["-y", "@google-cloud/observability-mcp"],
  });

  mcpClient = new Client({
    name: "first-responder",
    version: "0.1.0",
  });

  await mcpClient.connect(mcpTransport);

  return mcpClient;
}

/**
 * Close the MCP client and clean up resources
 */
export async function closeMcpClient(): Promise<void> {
  if (mcpClient) {
    await mcpClient.close();
    mcpClient = null;
    mcpTransport = null;
  }
}

/**
 * Get available tools from MCP server in Anthropic SDK format
 * Converts MCP tool schemas to Anthropic Tool type
 */
export async function getMcpTools(): Promise<Tool[]> {
  const client = await getMcpClient();
  const result = await client.listTools();

  return result.tools.map((mcpTool) => ({
    name: mcpTool.name,
    description: mcpTool.description || "",
    input_schema: {
      type: "object" as const,
      properties: mcpTool.inputSchema.properties as Record<string, unknown> || {},
      required: (mcpTool.inputSchema.required as string[]) || [],
    },
  }));
}

/**
 * Execute an MCP tool and return the result
 * Forwards tool calls from Claude to the MCP server
 */
export async function executeMcpTool(
  toolName: string,
  toolArgs: Record<string, unknown>
): Promise<unknown> {
  const client = await getMcpClient();

  const result = await client.callTool({
    name: toolName,
    arguments: toolArgs,
  });

  // MCP returns content array, extract text content
  if (result.content && Array.isArray(result.content)) {
    const textContent = result.content
      .filter((c): c is { type: "text"; text: string } => c.type === "text")
      .map((c) => c.text)
      .join("\n");

    // Try to parse as JSON if it looks like JSON
    if (textContent.startsWith("{") || textContent.startsWith("[")) {
      try {
        return JSON.parse(textContent);
      } catch {
        return textContent;
      }
    }
    return textContent;
  }

  return result;
}
