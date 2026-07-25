import assert from "node:assert/strict";
import type { RunResult } from "@cursor/sdk";
import { describe, it } from "node:test";
import {
  finalizeCursorCancelled,
  formatCursorStartMessage,
} from "../services/cursor/cursorAgentService.js";
import { finishCursorBackgroundRun } from "../services/cursor/finishCursorBackgroundRun.js";
import {
  createCursorTaskId,
  getCursorAgentTaskByIdOrAgentId,
  registerCursorAgentTask,
} from "../state/cursorAgentTasks.js";
import { drainNotifications } from "../state/agentNotifications.js";

describe("cursor background notifications", () => {
  it("notifies when a background Cursor run is stopped", () => {
    drainNotifications();
    const id = createCursorTaskId();
    registerCursorAgentTask({
      id,
      agentId: "agent-local-stop",
      runtime: "local",
      description: "stop me",
      status: "running",
      startedAt: new Date().toISOString(),
    });
    finalizeCursorCancelled(getCursorAgentTaskByIdOrAgentId(id)!, undefined, true);
    const notifications = drainNotifications();
    assert.equal(notifications.length, 1);
    assert.match(notifications[0]?.content ?? "", /<status>stopped<\/status>/);
    assert.equal(notifications[0]?.agentId, id);
  });

  it("promises automatic completion notification in start output", () => {
    const message = formatCursorStartMessage(
      "cursor-1",
      "agent-1",
      "run-1",
      "local",
    );
    assert.match(message, /notified when it completes/);
    assert.doesNotMatch(message, /Use TaskOutput/);
  });
});

describe("cursor background lifecycle", () => {
  it("finishes independently of an unrelated parent abort", async () => {
    drainNotifications();
    const id = createCursorTaskId();
    registerCursorAgentTask({
      id,
      agentId: "agent-background-1",
      runtime: "local",
      description: "background work",
      status: "running",
      startedAt: new Date().toISOString(),
    });
    let resolveRun: (result: RunResult) => void = () => {};
    const result = new Promise<RunResult>((resolve) => {
      resolveRun = resolve;
    });
    let closed = false;
    const agent = {
      close: () => {
        closed = true;
      },
    } as unknown as Parameters<typeof finishCursorBackgroundRun>[1];
    const run = {
      wait: () => result,
    } as unknown as Parameters<typeof finishCursorBackgroundRun>[2];
    const finished = finishCursorBackgroundRun(id, agent, run);
    const parent = new AbortController();
    parent.abort("user-cancel");
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(getCursorAgentTaskByIdOrAgentId(id)?.status, "running");
    resolveRun({ id: "run-background-1", status: "finished", result: "done" });
    await finished;
    assert.equal(getCursorAgentTaskByIdOrAgentId(id)?.status, "finished");
    assert.equal(closed, true);
    assert.equal(drainNotifications().length, 1);
  });
});
