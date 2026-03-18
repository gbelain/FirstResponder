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
