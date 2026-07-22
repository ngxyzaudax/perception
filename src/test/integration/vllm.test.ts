import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runPrintMode } from "../../cli/print.js";
import { getUsage, resetUsage } from "../../state/usage.js";
import { createToolRegistry } from "../../tools.js";
import { getTool } from "../../Tool.js";
import { loadSettings } from "../../utils/config.js";
import { runSmokeQuery } from "../fixtures/smokeQuery.js";

describe("vLLM integration", () => {
  it("fetches models via WebFetch", async () => {
    const registry = createToolRegistry();
    const webFetch = getTool(registry, "WebFetch");
    assert.ok(webFetch);
    const output = await webFetch!.call(
      { url: "http://localhost:8000/v1/models" },
      { cwd: process.cwd(), abortSignal: new AbortController().signal },
    );
    assert.ok(output.includes("nvidia") || output.includes("object"));
  });

  it("records token usage from print mode", async () => {
    resetUsage();
    const settings = await loadSettings();
    const exitCode = await runPrintMode(
      { ...settings, permissionMode: "bypassPermissions" },
      "Reply with exactly: token-test-ok",
    );
    assert.equal(exitCode, 0);
    const usage = getUsage();
    assert.ok(usage.promptTokens > 0);
    assert.ok(usage.requestCount > 0);
    assert.ok(usage.averageTokensPerSecond > 0);
  });

  it("runs sub-agent via print mode", async () => {
    const settings = await loadSettings();
    const exitCode = await runPrintMode(
      { ...settings, permissionMode: "bypassPermissions" },
      "Use the Agent tool with description 'count ts' and prompt 'Use Glob with pattern **/*.ts under src/ and report how many files match. Reply with only the number.' Then reply with: subagent-count=<that number>",
    );
    assert.equal(exitCode, 0);
  });

  it("runs read-only and shell smoke queries", async () => {
    const readOnly = await runSmokeQuery(
      "Use Glob to find package.json in the current directory.",
    );
    assert.ok(readOnly.length > 0);
    const shell = await runSmokeQuery("Use Bash to run: echo perception-smoke-ok");
    assert.match(shell, /perception-smoke-ok|ok/i);
  });
});
