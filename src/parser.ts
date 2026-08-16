import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import type { TestConfig, TestCase, ServerConfig } from "./types.js";

export function loadTestConfig(filePath: string): TestConfig {
  const absPath = path.resolve(filePath);

  if (!fs.existsSync(absPath)) {
    throw new Error(`Test file not found: ${absPath}`);
  }

  const raw = fs.readFileSync(absPath, "utf8");
  const ext = path.extname(absPath).toLowerCase();

  let parsed: unknown;
  try {
    if (ext === ".json") {
      parsed = JSON.parse(raw);
    } else {
      parsed = yaml.load(raw);
    }
  } catch (err) {
    throw new Error(`Failed to parse ${absPath}: ${(err as Error).message}`);
  }

  return validate(parsed, absPath);
}

function validate(raw: unknown, filePath: string): TestConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`${filePath}: root must be an object.`);
  }

  const obj = raw as Record<string, unknown>;

  if (obj["version"] !== 1) {
    throw new Error(`${filePath}: "version" must be 1.`);
  }

  const server = validateServer(obj["server"], filePath);

  const rawTests = obj["tests"];
  if (!Array.isArray(rawTests) || rawTests.length === 0) {
    throw new Error(`${filePath}: "tests" must be a non-empty array.`);
  }

  const tests: TestCase[] = rawTests.map((t, i) =>
    validateTestCase(t, i, filePath)
  );

  const options =
    obj["options"] && typeof obj["options"] === "object"
      ? (obj["options"] as TestConfig["options"])
      : {};

  return { version: 1, server, options, tests };
}

function validateServer(raw: unknown, filePath: string): ServerConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`${filePath}: "server" must be an object.`);
  }
  const s = raw as Record<string, unknown>;
  const transport = s["transport"];

  if (transport !== "stdio" && transport !== "sse") {
    throw new Error(`${filePath}: server.transport must be "stdio" or "sse".`);
  }

  if (transport === "stdio" && typeof s["command"] !== "string") {
    throw new Error(`${filePath}: server.command is required for stdio.`);
  }

  if (transport === "sse" && typeof s["url"] !== "string") {
    throw new Error(`${filePath}: server.url is required for SSE.`);
  }

  return s as unknown as ServerConfig;
}

function validateTestCase(raw: unknown, index: number, filePath: string): TestCase {
  const label = `${filePath}: tests[${index}]`;

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`${label}: must be an object.`);
  }

  const t = raw as Record<string, unknown>;

  if (typeof t["name"] !== "string" || t["name"].trim() === "") {
    throw new Error(`${label}: "name" must be a string.`);
  }

  if (typeof t["tool"] !== "string" || t["tool"].trim() === "") {
    throw new Error(`${label}: "tool" must be a string.`);
  }

  if (!t["input"] || typeof t["input"] !== "object" || Array.isArray(t["input"])) {
    throw new Error(`${label}: "input" must be an object.`);
  }

  if (!t["expect"] || typeof t["expect"] !== "object" || Array.isArray(t["expect"])) {
    throw new Error(`${label}: "expect" must be an object.`);
  }

  const expect = t["expect"] as Record<string, unknown>;
  const hasAssertion = "output" in expect || "contains" in expect || "snapshot" in expect || "error" in expect || "errorContains" in expect;

  if (!hasAssertion) {
    throw new Error(`${label}: "expect" needs at least one assertion.`);
  }

  return t as unknown as TestCase;
}
