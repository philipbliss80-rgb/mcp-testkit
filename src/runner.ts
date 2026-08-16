import path from "path";
import type { TestConfig, TestResult, RunSummary } from "./types.js";
import { MCPTestClient } from "./client.js";
import { match, matchSnapshot } from "./matcher.js";
import { SnapshotManager } from "./snapshot.js";
import * as reporter from "./reporter.js";

export interface RunOptions {
  filePath: string;
  json?: boolean;
  updateSnapshots?: boolean;
  silent?: boolean;
}

export async function run(config: TestConfig, opts: RunOptions): Promise<RunSummary> {
  const suiteName = path.basename(opts.filePath, path.extname(opts.filePath));
  const defaultTimeout = config.options?.timeout ?? 10_000;
  const snapshotDir = path.resolve(path.dirname(opts.filePath), config.options?.snapshotDir ?? ".snapshots");
  const snapshots = new SnapshotManager(snapshotDir);

  if (!opts.silent && !opts.json) reporter.printHeader(opts.filePath);

  const active = config.tests.filter((t) => !t.skip);
  if (!opts.silent && !opts.json) reporter.printRunLine(active.length);

  const client = new MCPTestClient();
  await client.connect(config.server);

  const availableTools = await client.listTools();
  const availableNames = new Set(availableTools.map((t) => t.name));

  const results: TestResult[] = [];
  const suiteStart = Date.now();

  for (const testCase of config.tests) {
    if (testCase.skip) {
      results.push({ name: testCase.name, tool: testCase.tool, status: "skipped", durationMs: 0 });
      continue;
    }

    if (!availableNames.has(testCase.tool)) {
      results.push({
        name: testCase.name,
        tool: testCase.tool,
        status: "failed",
        durationMs: 0,
        message: `Tool "${testCase.tool}" not found on server.`,
      });
      continue;
    }

    const timeout = testCase.timeout ?? defaultTimeout;
    const start = Date.now();
    let result: TestResult;

    try {
      const { result: actual, isError } = await withTimeout(
        client.callTool(testCase.tool, testCase.input),
        timeout,
        `Timeout after ${timeout}ms.`
      );

      if (testCase.expect.snapshot) {
        if (opts.updateSnapshots || !snapshots.exists(suiteName, testCase.name)) {
          snapshots.write(suiteName, testCase.name, actual);
          result = { name: testCase.name, tool: testCase.tool, status: "passed", durationMs: Date.now() - start };
        } else {
          const saved = snapshots.read(suiteName, testCase.name);
          const m = matchSnapshot(actual, saved);
          result = {
            name: testCase.name,
            tool: testCase.tool,
            status: m.pass ? "passed" : "failed",
            durationMs: Date.now() - start,
            actual,
            expected: saved,
            message: m.message,
          };
        }
      } else {
        const m = match(testCase.expect, actual, isError);
        result = {
          name: testCase.name,
          tool: testCase.tool,
          status: m.pass ? "passed" : "failed",
          durationMs: Date.now() - start,
          actual,
          expected: testCase.expect.output ?? testCase.expect.contains,
          message: m.message,
        };
      }
    } catch (err) {
      result = {
        name: testCase.name,
        tool: testCase.tool,
        status: "failed",
        durationMs: Date.now() - start,
        message: (err as Error).message,
      };
    }

    results.push(result);
    if (!opts.silent && !opts.json) reporter.printTestResult(result);
  }

  await client.disconnect();

  const totalMs = Date.now() - suiteStart;
  const passed = results.filter((r) => r.status === "passed").length;
  const failed = results.filter((r) => r.status === "failed").length;
  const skipped = results.filter((r) => r.status === "skipped").length;

  const summary: RunSummary = { total: results.length, passed, failed, skipped, durationMs: totalMs, results };

  if (!opts.silent) {
    if (opts.json) {
      reporter.printJsonSummary(summary);
    } else {
      reporter.printSummary(summary, suiteName);
    }
  }

  return summary;
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}
