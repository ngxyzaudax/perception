import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { z } from "zod";
import { createPermissionContext } from "../permissions/checkPermission.js";
import { runQuery } from "../query/queryEngine.js";
import { settingsSchema } from "../schemas/settings.js";
import { buildTool, type ToolRegistry } from "../Tool.js";
import type { QueryEvent } from "../types/messages.js";
import { closeTurnServer, listenTurnServer } from "./fixtures/turnServer.js";

const createRegistry = (onCall: () => void = (): void => undefined): ToolRegistry => ({
  Echo: buildTool({
    name: "Echo",
    description: "Echo a value",
    inputSchema: z.object({ value: z.string() }),
    isReadOnly: () => true,
    summarize: (input) => input.value,
    call: async (input): Promise<string> => {
      onCall();
      return input.value;
    },
  }),
});

const runTurnScenario = async (
  maxTurns?: number,
  abortDuringTool: boolean = false,
): Promise<{ result: Awaited<ReturnType<typeof runQuery>>; events: QueryEvent[]; requests: number }> => {
  const turnServer = await listenTurnServer();
  const events: QueryEvent[] = [];
  const controller = new AbortController();
  try {
    const result = await runQuery({
      settings: settingsSchema.parse({
        baseUrl: turnServer.baseUrl,
        apiKey: "local",
        permissionMode: "bypassPermissions",
      }),
      registry: createRegistry((): void => {
        if (abortDuringTool) {
          controller.abort();
        }
      }),
      messages: [{ role: "user", content: "start" }],
      permissionContext: createPermissionContext("bypassPermissions"),
      systemPromptOverride: "test",
      maxTurns,
      signal: controller.signal,
      onEvent: (event) => {
        events.push(event);
      },
    });
    return { result, events, requests: turnServer.requestCount() };
  } finally {
    await closeTurnServer(turnServer.server);
  }
};

describe("query turn limits", () => {
  it("is unlimited when maxTurns is omitted", async () => {
    const { result, events, requests } = await runTurnScenario();
    assert.equal(result.reason, "completed");
    assert.equal(result.turnCount, 2);
    assert.equal(requests, 2);
    assert.equal(events.some((event) => event.type === "max_turns_reached"), false);
    assert.deepEqual(
      events
        .filter((event) =>
          event.type === "preparing" ||
          event.type === "compacting" ||
          event.type === "requesting",
        )
        .map((event) => event.type),
      ["preparing", "requesting", "preparing", "requesting"],
    );
  });

  it("stops after tools and signals before the next model turn", async () => {
    const { result, events, requests } = await runTurnScenario(1);
    assert.deepEqual(result, {
      messages: result.messages,
      reason: "max_turns",
      turnCount: 2,
      maxTurns: 1,
    });
    assert.equal(requests, 1);
    assert.deepEqual(
      events.find((event) => event.type === "max_turns_reached"),
      { type: "max_turns_reached", maxTurns: 1, turnCount: 2 },
    );
    assert.equal(
      result.messages.some(
        (message) => message.role === "assistant" && message.content === "Turn limit reached",
      ),
      false,
    );
  });

  it("keeps abort as the terminal reason when it coincides with the limit", async () => {
    const { result, events, requests } = await runTurnScenario(1, true);
    assert.equal(result.reason, "aborted");
    assert.equal(requests, 1);
    assert.deepEqual(
      events.find((event) => event.type === "max_turns_reached"),
      { type: "max_turns_reached", maxTurns: 1, turnCount: 2 },
    );
  });
});
