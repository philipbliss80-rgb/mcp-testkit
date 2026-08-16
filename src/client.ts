import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { ServerConfig, ToolInfo } from "./types.js";

export class MCPTestClient {
  private client: Client;
  private transport: Transport | null = null;
  private connected = false;

  constructor() {
    this.client = new Client(
      { name: "mcp-testkit", version: "0.1.0" },
      { capabilities: {} }
    );
  }

  async connect(config: ServerConfig): Promise<void> {
    if (config.transport === "stdio") {
      if (!config.command) {
        throw new Error("ServerConfig.command is required for stdio transport.");
      }
      this.transport = new StdioClientTransport({
        command: config.command,
        args: config.args ?? [],
        env: config.env,
        stderr: "pipe",
      });
    } else if (config.transport === "sse") {
      if (!config.url) {
        throw new Error("ServerConfig.url is required for SSE transport.");
      }
      this.transport = new SSEClientTransport(new URL(config.url));
    } else {
      throw new Error(`Unknown transport. Use "stdio" or "sse".`);
    }

    await this.client.connect(this.transport);
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.client.close();
      this.connected = false;
    }
  }

  async listTools(): Promise<ToolInfo[]> {
    this.assertConnected();
    const response = await this.client.listTools();
    return response.tools.map((t: { name: string; description?: string; inputSchema: Record<string, unknown> }) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema as Record<string, unknown>,
    }));
  }

  async callTool(
    name: string,
    args: Record<string, unknown>
  ): Promise<{ result: unknown; isError: boolean }> {
    this.assertConnected();

    const raw = await this.client.callTool({ name, arguments: args });
    const isError = raw.isError === true;

    const content = raw.content as Array<{ type: string; text?: string }>;

    if (!content || content.length === 0) {
      return { result: null, isError };
    }

    if (content.length === 1 && content[0].type === "text") {
      const text = content[0].text ?? "";
      try {
        return { result: JSON.parse(text), isError };
      } catch {
        return { result: text, isError };
      }
    }

    return { result: content, isError };
  }

  getServerCapabilities() {
    return this.client.getServerCapabilities();
  }

  getServerVersion() {
    return this.client.getServerVersion();
  }

  private assertConnected(): void {
    if (!this.connected) {
      throw new Error("MCPTestClient is not connected. Call connect() first.");
    }
  }
}
