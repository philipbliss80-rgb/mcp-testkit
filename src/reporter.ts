import chalk from "chalk";
import type { TestResult, RunSummary } from "./types.js";

const PASS = chalk.green("✓");
const FAIL = chalk.red("✗");
const SKIP = chalk.yellow("○");

export function printTestResult(result: TestResult): void {
  const icon = result.status === "passed" ? PASS : result.status === "skipped" ? SKIP : FAIL;
  const name = result.status === "failed" ? chalk.red(result.name) : result.name;
  const dur = chalk.dim(`${result.durationMs}ms`);
  process.stdout.write(`  ${icon} ${name} ${dur}\n`);
  if (result.status === "failed" && result.message) {
    const lines = result.message.split("\n").map((l) => `      ${l}`).join("\n");
    process.stdout.write(`\n${chalk.red(lines)}\n\n`);
  }
}

export function printSummary(summary: RunSummary, suiteName: string): void {
  const { total, passed, failed, skipped, durationMs } = summary;
  console.log("");
  console.log(chalk.bold(`Results for: ${suiteName}`));
  console.log(
    [
      passed > 0 ? chalk.green(`${passed} passed`) : null,
      failed > 0 ? chalk.red(`${failed} failed`) : null,
      skipped > 0 ? chalk.yellow(`${skipped} skipped`) : null,
    ].filter(Boolean).join(chalk.dim(", ")) + chalk.dim(` — ${total} total in ${durationMs}ms`)
  );
  console.log("");
}

export function printHeader(filePath: string): void {
  console.log("");
  console.log(chalk.bold.cyan("mcp-testkit") + chalk.dim(` v0.1.0`));
  console.log(chalk.dim(`  Suite: ${filePath}`));
  console.log("");
}

export function printRunLine(count: number): void {
  console.log(chalk.dim(`  Running ${count} test${count === 1 ? "" : "s"}...`));
  console.log("");
}

export function printComplianceReport(report: any): void {
  console.log("");
  console.log(chalk.bold.cyan("MCP Compliance Report"));
  console.log(chalk.dim(`  Server: ${report.serverName} v${report.serverVersion}`));
  console.log(chalk.dim(`  Tools:  ${report.toolCount}`));
  console.log("");
  if (report.issues.length === 0) {
    console.log(chalk.green("  ✓ No compliance issues found."));
  } else {
    for (const issue of report.issues) {
      const prefix = issue.severity === "error" ? chalk.red("  ✗") : chalk.yellow("  !");
      const tool = issue.tool ? chalk.dim(` [${issue.tool}]`) : "";
      console.log(`${prefix}${tool} ${issue.message}`);
    }
  }
  console.log("");
  console.log(report.passed ? chalk.green.bold("  PASSED") : chalk.red.bold("  FAILED"));
  console.log("");
}

export function printJsonSummary(summary: RunSummary): void {
  process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
}
