import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const server = new Server({ name: "calculator", version: "1.0.0" }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    { name: "add", description: "Add two numbers.", inputSchema: { type: "object", properties: { a: { type: "number" }, b: { type: "number" } }, required: ["a", "b"] } },
    { name: "multiply", description: "Multiply two numbers.", inputSchema: { type: "object", properties: { a: { type: "number" }, b: { type: "number" } }, required: ["a", "b"] } },
    { name: "divide", description: "Divide a by b.", inputSchema: { type: "object", properties: { a: { type: "number" }, b: { type: "number" } }, required: ["a", "b"] } },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  if (name === "add") return { content: [{ type: "text", text: JSON.stringify({ result: args.a + args.b }) }] };
  if (name === "multiply") return { content: [{ type: "text", text: JSON.stringify({ result: args.a * args.b }) }] };
  if (name === "divide") {
    if (args.b === 0) return { isError: true, content: [{ type: "text", text: "Error: division by zero." }] };
    return { content: [{ type: "text", text: JSON.stringify({ result: args.a / args.b }) }] };
  }
  throw new Error(`Unknown tool: ${name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
