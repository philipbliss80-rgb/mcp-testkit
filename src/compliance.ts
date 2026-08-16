import type { MCPTestClient } from "./client.js";
import type { ComplianceIssue, ComplianceReport, ToolInfo } from "./types.js";

export async function checkCompliance(client: MCPTestClient): Promise<ComplianceReport> {
  const versionInfo = client.getServerVersion();
  const serverName = versionInfo?.name ?? "unknown";
  const serverVersion = versionInfo?.version ?? "unknown";

  const tools = await client.listTools();
  const issues: ComplianceIssue[] = [];

  for (const tool of tools) {
    issues.push(...checkTool(tool));
  }

  return {
    serverName,
    serverVersion,
    toolCount: tools.length,
    issues,
    passed: issues.filter((i) => i.severity === "error").length === 0,
  };
}

function checkTool(tool: ToolInfo): ComplianceIssue[] {
  const issues: ComplianceIssue[] = [];
  const ctx = tool.name;

  if (!tool.name || tool.name.trim() === "") {
    issues.push({ severity: "error", message: "Empty tool name." });
  }

  if (!tool.description || tool.description.trim() === "") {
    issues.push({ severity: "warn", tool: ctx, message: 'Missing "description".' });
  }

  const schema = tool.inputSchema;
  if (!schema || typeof schema !== "object") {
    issues.push({ severity: "error", tool: ctx, message: '"inputSchema" must be an object.' });
    return issues;
  }

  if (schema["type"] !== "object") {
    issues.push({ severity: "error", tool: ctx, message: '"inputSchema.type" must be "object".' });
  }

  return issues;
}
