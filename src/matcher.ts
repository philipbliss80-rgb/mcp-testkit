import deepEqual from "fast-deep-equal";
import type { Expectation } from "./types.js";

export interface MatchResult {
  pass: boolean;
  message?: string;
}

export function match(expectation: Expectation, actual: unknown, isError: boolean): MatchResult {
  if (expectation.errorContains !== undefined) {
    if (!isError) return fail("Expected an error but the tool succeeded.");
    const text = extractText(actual);
    if (!text.includes(expectation.errorContains)) {
      return fail(`Error message does not contain "${expectation.errorContains}".\n  Got: ${JSON.stringify(text)}`);
    }
    return pass();
  }

  if (expectation.error === true) {
    if (!isError) return fail("Expected an error but the tool succeeded.");
    return pass();
  }

  if (isError && !expectation.error && !expectation.errorContains) {
    const text = extractText(actual);
    return fail(`Tool returned an error unexpectedly.\n  Error: ${text}`);
  }

  if (expectation.output !== undefined) {
    if (!deepEqual(actual, expectation.output)) {
      return fail(`Output does not match.\n  Expected: ${JSON.stringify(expectation.output, null, 2)}\n  Got: ${JSON.stringify(actual, null, 2)}`);
    }
  }

  if (expectation.contains !== undefined) {
    const missing = missingKeys(actual, expectation.contains);
    if (missing.length > 0) {
      return fail(`Output missing keys:\n${missing.map((m) => `  ${m}`).join("\n")}\n  Got: ${JSON.stringify(actual, null, 2)}`);
    }
  }

  return pass();
}

export function matchSnapshot(actual: unknown, snapshot: unknown): MatchResult {
  if (!deepEqual(actual, snapshot)) {
    return fail(`Output changed.\n  Snapshot: ${JSON.stringify(snapshot, null, 2)}\n  Got: ${JSON.stringify(actual, null, 2)}`);
  }
  return pass();
}

function pass(): MatchResult { return { pass: true }; }
function fail(message: string): MatchResult { return { pass: false, message }; }

function missingKeys(actual: unknown, required: Record<string, unknown>, prefix = ""): string[] {
  const problems: string[] = [];
  if (typeof actual !== "object" || actual === null || Array.isArray(actual)) {
    return [`${prefix || "root"}: not an object`];
  }
  const actualObj = actual as Record<string, unknown>;
  for (const [key, expectedVal] of Object.entries(required)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (!(key in actualObj)) {
      problems.push(`Missing: "${fullKey}"`);
      continue;
    }
    if (expectedVal !== null && typeof expectedVal === "object" && !Array.isArray(expectedVal)) {
      problems.push(...missingKeys(actualObj[key], expectedVal as Record<string, unknown>, fullKey));
    } else if (!deepEqual(actualObj[key], expectedVal)) {
      problems.push(`"${fullKey}": expected ${JSON.stringify(expectedVal)}, got ${JSON.stringify(actualObj[key])}`);
    }
  }
  return problems;
}

function extractText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === "object" && item !== null && "text" in item) {
        return (item as { text: string }).text;
      }
      return JSON.stringify(item);
    }).join(" ");
  }
  return JSON.stringify(value ?? "");
}
