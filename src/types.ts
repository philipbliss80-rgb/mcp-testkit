export interface TestConfig {
  version: 1;
  server: ServerConfig;
  options?: SuiteOptions;
  tests: TestCase[];
}

export interface ServerConfig {
  transport: "stdio" | "sse";
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
}

export interface SuiteOptions {
  timeout?: number;
  snapshotDir?: string;
}

export interface TestCase {
  name: string;
  tool: string;
  input: Record<string, unknown>;
  expect: Expectation;
  skip?: boolean;
  timeout?: number;
}

export interface Expectation {
  output?: unknown;
  contains?: Record<string, unknown>;
  snapshot?: boolean;
  error?: boolean;
  errorContains?: string;
}

export type TestStatus = "passed" | "failed" | "skipped";

export interface TestResult {
  name: string;
  tool: string;
  status: TestStatus;
  durationMs: number;
  message?: string;
  actual?: unknown;
  expected?: unknown;
}

export interface RunSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  durationMs: number;
  results: TestResult[];
}

export interface ToolInfo {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
}

export interface ComplianceIssue {
  severity: "error" | "warn";
  tool?: string;
  message: string;
}

export interface ComplianceReport {
  serverName: string;
  serverVersion: string;
  toolCount: number;
  issues: ComplianceIssue[];
  passed: boolean;
}
