import assert from "node:assert";
import { describe, it } from "node:test";
import {
  MAX_WORKING_MESSAGES,
  prepareWorking,
  shouldCompactWorking,
} from "../query/midQueryCompact.js";
import { settingsSchema } from "../schemas/settings.js";
import { recordUsage, resetUsage } from "../state/usage.js";
import type { ChatMessage, QueryEvent } from "../types/messages.js";

const userMessage = (chars: number): ChatMessage => ({
  role: "user",
  content: "a".repeat(chars),
});

const toolTurn = (id: string): ChatMessage[] => [
  {
    role: "assistant",
    content: "",
    toolCalls: [{ id, name: "Read", arguments: "{}" }],
  },
  { role: "tool", toolCallId: id, name: "Read", content: "result", isError: false },
];

describe("shouldCompactWorking", () => {
  it("stays quiet for empty history", () => {
    assert.ok(!shouldCompactWorking(300000, [], 262144));
  });

  it("stays quiet below the threshold", () => {
    assert.ok(!shouldCompactWorking(100000, [userMessage(100)], 262144));
  });

  it("triggers on reported prompt tokens above threshold", () => {
    assert.ok(shouldCompactWorking(240000, [userMessage(100)], 262144));
  });

  it("triggers on estimated history size when prompt tokens are stale", () => {
    assert.ok(shouldCompactWorking(0, [userMessage(1_000_000)], 262144));
  });

  it("compacts excessive message counts without bypassing the failure circuit", () => {
    const messages = Array.from(
      { length: MAX_WORKING_MESSAGES + 1 },
      (): ChatMessage => userMessage(1),
    );
    assert.ok(shouldCompactWorking(0, messages, 262144));
    assert.equal(shouldCompactWorking(0, messages, 262144, 3), false);
  });

  it("prepares history without remote tokenization requests", async () => {
    const originalFetch = globalThis.fetch;
    let requestCount = 0;
    globalThis.fetch = async () => {
      requestCount += 1;
      throw new Error("unexpected request");
    };
    try {
      await prepareWorking({
        settings: settingsSchema.parse({}),
        working: [
          { role: "system", content: "system" },
          { role: "user", content: "hello" },
        ],
        maxContextTokens: 262144,
        compactedAtRequestCount: Number.MAX_SAFE_INTEGER,
        compactFailures: 0,
        onEvent: () => undefined,
      });
      assert.equal(requestCount, 0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("discards stale usage after micro-compaction", async () => {
    resetUsage();
    recordUsage({ promptTokens: 240000, completionTokens: 1, generationMs: 1 });
    const events: QueryEvent[] = [];
    const working: ChatMessage[] = [
      { role: "system", content: "system" },
      { role: "user", content: "start" },
      ...toolTurn("1"),
      ...toolTurn("2"),
      ...toolTurn("3"),
      ...toolTurn("4"),
    ];
    try {
      await prepareWorking({
        settings: settingsSchema.parse({}),
        working,
        maxContextTokens: 262144,
        compactedAtRequestCount: 0,
        compactFailures: 0,
        onEvent: (event): void => {
          events.push(event);
        },
      });
      assert.equal(events.some((event) => event.type === "compacting"), false);
      assert.equal(
        working.some(
          (message) =>
            message.role === "tool" &&
            message.content === "[Old tool result content cleared]",
        ),
        true,
      );
    } finally {
      resetUsage();
    }
  });
});
