import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { z } from "zod";
import { buildTool } from "../Tool.js";
import { createPermissionContext } from "../permissions/checkPermission.js";
import { createStreamingToolRunner } from "../query/streamingToolRunner.js";
import { settingsSchema } from "../schemas/settings.js";
import type { ToolCall } from "../types/messages.js";

const settings = settingsSchema.parse({});

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const makeRegistry = (executionLog: string[]) => {
  const safeTool = buildTool({
    name: "SafeRead",
    description: "safe",
    inputSchema: z.object({ target: z.string() }),
    isReadOnly: () => true,
    summarize: (input) => input.target,
    call: async (input) => {
      await delay(20);
      executionLog.push(`safe:${input.target}`);
      return `read ${input.target}`;
    },
  });
  const unsafeTool = buildTool({
    name: "UnsafeWrite",
    description: "unsafe",
    inputSchema: z.object({ target: z.string() }),
    isReadOnly: () => false,
    summarize: (input) => input.target,
    call: async (input) => {
      executionLog.push(`unsafe:${input.target}`);
      return `wrote ${input.target}`;
    },
  });
  return { SafeRead: safeTool, UnsafeWrite: unsafeTool };
};

const makeRunner = (executionLog: string[], signal?: AbortSignal) =>
  createStreamingToolRunner({
    registry: makeRegistry(executionLog),
    settings,
    permissionContext: createPermissionContext("bypassPermissions"),
    signal,
    onEvent: () => undefined,
  });

const safeCall = (id: string, target: string): ToolCall => ({
  id,
  name: "SafeRead",
  arguments: JSON.stringify({ target }),
});

const unsafeCall = (id: string, target: string): ToolCall => ({
  id,
  name: "UnsafeWrite",
  arguments: JSON.stringify({ target }),
});

describe("streaming tool runner", () => {
  it("starts concurrency-safe tools before the stream finishes", () => {
    const log: string[] = [];
    const runner = makeRunner(log);
    runner.observe([safeCall("1", "a"), { id: "2", name: "SafeRead", arguments: '{"tar' }]);
    assert.equal(runner.startedCount(), 1);
  });

  it("does not start calls with incomplete json arguments", () => {
    const log: string[] = [];
    const runner = makeRunner(log);
    runner.observe([
      { id: "1", name: "SafeRead", arguments: '{"target":' },
      { id: "2", name: "SafeRead", arguments: "" },
    ]);
    assert.equal(runner.startedCount(), 0);
  });

  it("does not start mutating tools mid-stream", () => {
    const log: string[] = [];
    const runner = makeRunner(log);
    runner.observe([unsafeCall("1", "a"), safeCall("2", "b")]);
    assert.equal(runner.startedCount(), 0);
  });

  it("merges results in original call order", async () => {
    const log: string[] = [];
    const runner = makeRunner(log);
    const calls = [safeCall("1", "a"), unsafeCall("2", "b"), safeCall("3", "c")];
    runner.observe(calls);
    const messages = await runner.finish(calls);
    assert.equal(messages.length, 3);
    assert.deepEqual(
      messages.map((message) => (message.role === "tool" ? message.toolCallId : "")),
      ["1", "2", "3"],
    );
    assert.ok(messages[0]?.content.includes("read a"));
    assert.ok(messages[1]?.content.includes("wrote b"));
    assert.ok(messages[2]?.content.includes("read c"));
  });

  it("synthesizes cancelled results for remaining mutating calls after abort", async () => {
    const log: string[] = [];
    const controller = new AbortController();
    const runner = makeRunner(log, controller.signal);
    const calls = [safeCall("1", "a"), unsafeCall("2", "b")];
    runner.observe(calls);
    controller.abort("user-cancel");
    const messages = await runner.finish(calls);
    assert.equal(messages.length, 2);
    assert.equal(messages[0]?.role === "tool" ? messages[0].toolCallId : "", "1");
    assert.equal(messages[1]?.role === "tool" ? messages[1].toolCallId : "", "2");
    assert.ok(messages[1]?.content.includes("Tool call aborted before completion."));
    assert.ok(!log.includes("unsafe:b"));
  });

  it("returns synthetic cancelled results for hanging tools on abort", async () => {
    const hangingTool = buildTool({
      name: "Hang",
      description: "hang",
      inputSchema: z.object({ target: z.string() }),
      isReadOnly: () => false,
      summarize: (input) => input.target,
      call: async () => new Promise(() => undefined),
    });
    const registry = { ...makeRegistry([]), Hang: hangingTool };
    const controller = new AbortController();
    const runner = createStreamingToolRunner({
      registry,
      settings,
      permissionContext: createPermissionContext("bypassPermissions"),
      signal: controller.signal,
      onEvent: () => undefined,
    });
    const calls = [
      { id: "1", name: "Hang", arguments: JSON.stringify({ target: "x" }) },
    ];
    runner.observe(calls);
    controller.abort("user-cancel");
    const messages = await Promise.race([
      runner.finish(calls),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("finish hung")), 500);
      }),
    ]);
    assert.equal(messages.length, 1);
    assert.equal(messages[0]?.role === "tool" ? messages[0].toolCallId : "", "1");
    assert.ok(messages[0]?.content.includes("Tool call aborted before completion."));
  });
});
