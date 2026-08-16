#!/usr/bin/env node

import { Command } from "commander";
import path from "path";
import fs from "fs";
import { loadTestConfig } from "./parser.js";
import { run } from "./runner.js";
import { MCPTestClient } from "./client.js";
import { checkCompliance } from "./compliance.js";
import { printComplianceReport } from "./reporter.js";

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8")) as { version: string };
const program = new Command();

program.name("mcp-testkit").description("Testing framework for MCP servers").version(pkg.version);

program
  .command("run <testFile>")
  .description("Execute a test suite.")
  .option("--json", "Output JSON.")
  .option("-u, --update-snapshots", "Update snapshots.")
  .action(async (testFile: string, opts: { json?: boolean; updateSnapshots?: boolean }) => {
    const filePath = path.resolve(testFile);
    let config;
    try {
      config = loadTestConfig(filePath);
    } catch (err) {
      console.error((err as Error).message);
      process.exit(1);
    }
    const summary = await run(config, { filePath, json: opts.json, updateSnapshots: opts.updateSnapshots });
    process.exit(summary.failed > 0 ? 1 : 0);
  });

program
  .command("check <testFile>")
  .description("Run compliance checks.")
  .action(async (testFile: string) => {
    const filePath = path.resolve(testFile);
    let config;
    try {
      config = loadTestConfig(filePath);
    } catch (err) {
      console.error((err as Error).message);
      process.exit(1);
    }
    const client = new MCPTestClient();
    try {
      await client.connect(config.server);
      const report = await checkCompliance(client);
      await client.disconnect();
      printComplianceReport(report);
      process.exit(report.passed ? 0 : 1);
    } catch (err) {
      console.error("Failed:", (err as Error).message);
      process.exit(1);
    }
  });

program
  .command("init")
  .description("Generate starter test file.")
  .action(() => {
    const dest = path.join(process.cwd(), "mcp-tests.yaml");
    if (fs.existsSync(dest)) {
      console.error(`Already exists: ${dest}`);
      process.exit(1);
    }
    const template = `version: 1
server:
  transport: stdio
  command: node
  args: ["./your-server.js"]
tests:
  - name: Example
    tool: tool_name
    input: {}
    expect:
      output: result
`;
    fs.writeFileSync(dest, template, "utf8");
    console.log(`Created: ${dest}`);
  });

program.parseAsync(process.argv).catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});
