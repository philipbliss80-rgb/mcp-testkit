import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const server = new Server({ name: "fixture", version: "0.0.1" }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{ name: "echo", description: "Echo", inputSchema: { type: "object", properties: { message: { type: "string" } }, required: ["message"] } }],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  if (req.params.name === "echo") return { content: [{ type: "text", text: req.params.arguments.message }] };
  throw new Error("Unknown tool");
});

const transport = new StdioServerTransport();
await server.connect(transport);
