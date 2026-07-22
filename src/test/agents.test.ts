import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { continueAgent, stopAgent } from "../services/agents/agentLifecycle.js";
import { loadAgents, getAgentByName } from "../services/agents/loadAgents.js";
import { readPlanFile, writePlanFile, resolvePlanPath } from "../services/plans/planFiles.js";
import { createPermissionContext } from "../permissions/checkPermission.js";
import {
  createAgentId,
  getAgentTask,
  registerAgentTask,
  updateAgentTask,
} from "../state/agentTasks.js";
import {
  drainNotifications,
  enqueueNotification,
  formatTaskNotification,
} from "../state/agentNotifications.js";
import { createToolRegistry } from "../tools.js";
import type { ToolRuntime } from "../Tool.js";
import type { Settings } from "../schemas/settings.js";

describe("agent definitions", () => {
  it("loads custom agents from disk", async () => {
    const root = await mkdtemp(join(tmpdir(), "perception-agent-"));
    const agentsDir = join(root, "agents");
    await mkdir(agentsDir, { recursive: true });
    await writeFile(
      join(agentsDir, "reviewer.md"),
      "---\nname: reviewer\ndescription: Review code\ntools: Read,Grep\n---\nReview carefully",
      "utf8",
    );
    process.env.PERCEPTION_HOME = root;
    const agents = await loadAgents();
    const agent = getAgentByName(agents, "reviewer");
    assert.ok(agent?.tools.includes("Read"));
    delete process.env.PERCEPTION_HOME;
    await rm(root, { recursive: true, force: true });
  });

  it("round-trips plan files", async () => {
    const root = await mkdtemp(join(tmpdir(), "perception-plan-"));
    process.env.PERCEPTION_HOME = root;
    await writePlanFile("session-1", "# Plan\nDo things");
    const plan = await readPlanFile("session-1");
    assert.match(plan ?? "", /Do things/);
    assert.match(resolvePlanPath("session-1"), /session-1/);
    delete process.env.PERCEPTION_HOME;
    await rm(root, { recursive: true, force: true });
  });
});

describe("multi-agent lifecycle", () => {
  it("formats task notifications with branch and diffstat", () => {
    const content = formatTaskNotification({
      agentId: "agent-1",
      agentName: "researcher",
      description: "Investigate auth",
      status: "completed",
      result: "found bug",
      branch: "agent/agent-1",
      diffstat: " src/auth.ts | 2 ++",
    });
    assert.match(content, /<branch>agent\/agent-1<\/branch>/);
    assert.match(content, /<diffstat>/);
  });

  it("queues and drains notifications", () => {
    enqueueNotification({ content: "one", agentId: "a1" });
    enqueueNotification({ content: "two", agentId: "a2" });
    assert.equal(drainNotifications().length, 2);
    assert.equal(drainNotifications().length, 0);
  });

  it("registers and updates agent tasks", () => {
    const id = createAgentId();
    assert.match(id, /^agent-/);
    registerAgentTask({
      id,
      name: "worker",
      description: "test",
      status: "idle",
      messages: [],
      pendingMessages: [],
      abortController: new AbortController(),
      transcriptPath: "/tmp/transcript.txt",
      sessionId: "session-1",
      startedAt: new Date().toISOString(),
    });
    assert.equal(getAgentTask(id)?.name, "worker");
    updateAgentTask(id, { status: "running" });
    assert.equal(getAgentTask(id)?.status, "running");
  });

  it("stops running agents", async () => {
    const id = createAgentId();
    registerAgentTask({
      id,
      description: "stop-me",
      status: "running",
      messages: [],
      pendingMessages: [],
      abortController: new AbortController(),
      transcriptPath: "/tmp/stop.txt",
      sessionId: "session-1",
      startedAt: new Date().toISOString(),
    });
    const result = await stopAgent(id);
    assert.match(result, /Stopped/);
    assert.equal(getAgentTask(id)?.status, "stopped");
  });

  it("queues messages for running agents", async () => {
    const id = createAgentId();
    registerAgentTask({
      id,
      name: "runner",
      description: "running task",
      status: "running",
      messages: [{ role: "user", content: "start" }],
      pendingMessages: [],
      abortController: new AbortController(),
      transcriptPath: "/tmp/run.txt",
      sessionId: "session-1",
      startedAt: new Date().toISOString(),
    });
    const settings: Settings = {
      baseUrl: "http://localhost:8000/v1",
      apiKey: "local",
      permissionMode: "default",
      alwaysAllowRules: [],
      webSearchUrls: [],
      hooks: {},
      lspServers: {},
    };
    const runtime: ToolRuntime = {
      settings,
      registry: createToolRegistry(),
      permissionContext: createPermissionContext("default"),
      onEvent: () => {},
      sessionId: "session-1",
    };
    const result = await continueAgent("runner", "follow up", runtime);
    assert.match(result, /queued/);
    assert.equal(getAgentTask(id)?.pendingMessages.length, 1);
  });
});
