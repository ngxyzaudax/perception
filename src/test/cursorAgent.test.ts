import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createCursorTaskId,
  getCursorAgentTaskByIdOrAgentId,
  registerCursorAgentTask,
  updateCursorAgentTask,
} from "../state/cursorAgentTasks.js";
import {
  finalizeCursorCancelled,
  finalizeCursorRun,
  missingCursorApiKeyMessage,
  requireCursorApiKey,
} from "../services/cursor/cursorAgentService.js";
import { buildAgentOptions, buildResumeOptions } from "../services/cursor/buildAgentOptions.js";
import { settingsSchema } from "../schemas/settings.js";

describe("cursor agent tasks", () => {
  it("registers and resolves by agent id", () => {
    const id = createCursorTaskId();
    registerCursorAgentTask({
      id,
      agentId: "agent-local-1",
      runtime: "local",
      description: "test",
      status: "running",
      startedAt: new Date().toISOString(),
    });
    assert.equal(getCursorAgentTaskByIdOrAgentId("agent-local-1")?.id, id);
    updateCursorAgentTask(id, { status: "finished", resultText: "done" });
    assert.equal(getCursorAgentTaskByIdOrAgentId(id)?.status, "finished");
  });
});

describe("cursor agent api key", () => {
  it("reads key from settings", () => {
    const settings = settingsSchema.parse({ cursorApiKey: "crsr_test" });
    assert.equal(requireCursorApiKey(settings), "crsr_test");
  });

  it("returns setup message when key missing", () => {
    const settings = settingsSchema.parse({});
    assert.equal(requireCursorApiKey(settings), null);
    assert.match(missingCursorApiKeyMessage(), /CURSOR_API_KEY/);
  });
});

describe("cursor agent options", () => {
  it("enables local sandbox with cwd", () => {
    const options = buildAgentOptions({
      apiKey: "crsr_test",
      model: "composer-2.5",
      runtime: "local",
      cwd: "/tmp/worktree",
    });
    assert.equal(options.local?.cwd, "/tmp/worktree");
    assert.equal(options.local?.sandboxOptions?.enabled, true);
  });

  it("enables sandbox on resume options for local agents", () => {
    const options = buildResumeOptions({
      apiKey: "crsr_test",
      runtime: "local",
      cwd: "/tmp/worktree",
    });
    assert.equal(options.local?.cwd, "/tmp/worktree");
    assert.equal(options.local?.sandboxOptions?.enabled, true);
  });

  it("does not set local sandbox for cloud agents", () => {
    const options = buildAgentOptions({
      apiKey: "crsr_test",
      model: "composer-2.5",
      runtime: "cloud",
      cwd: "/tmp/unused",
      repoUrl: "https://github.com/example/repo.git",
    });
    assert.equal(options.local, undefined);
    assert.ok(options.cloud);
  });
});

describe("cursor agent finalize", () => {
  it("marks cancelled runs without notification payload requirement", () => {
    const id = createCursorTaskId();
    registerCursorAgentTask({
      id,
      agentId: "agent-local-2",
      runtime: "local",
      description: "cancel me",
      status: "running",
      startedAt: new Date().toISOString(),
    });
    const message = finalizeCursorCancelled(getCursorAgentTaskByIdOrAgentId(id)!);
    assert.match(message, /cancelled/i);
    assert.equal(getCursorAgentTaskByIdOrAgentId(id)?.status, "cancelled");
  });

  it("maps finished runs to task state", () => {
    const id = createCursorTaskId();
    registerCursorAgentTask({
      id,
      agentId: "agent-local-3",
      runtime: "local",
      description: "finish me",
      status: "running",
      startedAt: new Date().toISOString(),
    });
    const message = finalizeCursorRun(
      getCursorAgentTaskByIdOrAgentId(id)!,
      { id: "run-1", status: "finished", result: "all good" },
      false,
    );
    assert.match(message, /all good/);
    assert.equal(getCursorAgentTaskByIdOrAgentId(id)?.status, "finished");
  });
});
