import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { describe, it } from "node:test";
import { createPermissionContext } from "../permissions/checkPermission.js";
import { cancelTurn } from "../screens/cancelTurn.js";
import { startAgent } from "../services/agents/agentLifecycle.js";
import type { Settings } from "../schemas/settings.js";
import {
  drainNotifications,
} from "../state/agentNotifications.js";
import {
  getAgentTask,
  listAgentTasks,
} from "../state/agentTasks.js";
import { createToolRegistry } from "../tools.js";
import type { ToolRuntime } from "../Tool.js";

const makeSettings = (baseUrl: string): Settings => ({
  baseUrl,
  apiKey: "local",
  permissionMode: "default",
  alwaysAllowRules: [],
  denyRules: [],
  askRules: [],
  allowedDomains: [],
  additionalDirectories: [],
  webSearchUrls: [],
  memoryExtraction: false,
  hooks: {},
  lspServers: {},
});

const listenHangServer = async (): Promise<{ server: Server; baseUrl: string }> => {
  const server = createServer((request, response) => {
    if (request.url?.includes("/models")) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ data: [{ id: "test-model", max_model_len: 8192 }] }));
      return;
    }
  });
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("failed to bind hang server");
  }
  return { server, baseUrl: `http://127.0.0.1:${address.port}/v1` };
};

const waitFor = async (
  predicate: () => boolean,
  timeoutMs: number,
): Promise<void> => {
  const started = Date.now();
  while (!predicate()) {
    if (Date.now() - started > timeoutMs) {
      throw new Error("waitFor timed out");
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
};

describe("cancelTurn", () => {
  it("clears permissions, questions, and aborts the query", () => {
    const calls: string[] = [];
    cancelTurn({
      cancelPermissions: () => calls.push("permissions"),
      cancelQuestion: () => calls.push("question"),
      abortQuery: () => calls.push("abort"),
    });
    assert.deepEqual(calls, ["permissions", "question", "abort"]);
  });
});

describe("Esc while foreground agent runs", () => {
  it("stops the linked agent without a completion notification", async () => {
    drainNotifications();
    const { server, baseUrl } = await listenHangServer();
    const parent = new AbortController();
    const before = new Set(listAgentTasks().map((task) => task.id));
    const runtime: ToolRuntime = {
      settings: makeSettings(baseUrl),
      registry: createToolRegistry(),
      permissionContext: createPermissionContext("default"),
      onEvent: () => {},
      sessionId: "esc-session",
    };
    const started = startAgent({
      description: "esc-parallel",
      prompt: "hang until cancelled",
      runtime,
      signal: parent.signal,
      runInBackground: false,
    });
    try {
      await waitFor(
        () => listAgentTasks().some((task) => !before.has(task.id) && task.status === "running"),
        3000,
      );
      const agentId = listAgentTasks().find((task) => !before.has(task.id))?.id;
      assert.ok(agentId);
      cancelTurn({
        cancelPermissions: () => undefined,
        cancelQuestion: () => undefined,
        abortQuery: () => parent.abort("user-cancel"),
      });
      const result = await Promise.race([
        started,
        new Promise<string>((_, reject) => {
          setTimeout(() => reject(new Error("agent did not stop after Esc")), 5000);
        }),
      ]);
      assert.match(result, /cancelled/i);
      assert.equal(getAgentTask(agentId)?.status, "stopped");
      assert.equal(drainNotifications().length, 0);
    } finally {
      parent.abort("cleanup");
      await started.catch(() => undefined);
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });
});
