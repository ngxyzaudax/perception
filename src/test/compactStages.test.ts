import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getAutoCompactThreshold,
  MAX_COMPACT_FAILURES,
  shouldAutoCompact,
} from "../services/compact/autoCompact.js";
import {
  countClearedToolResults,
  microCompactMessages,
} from "../services/compact/microCompact.js";
import type { ChatMessage } from "../types/messages.js";

describe("compact stages", () => {
  it("computes effective-window threshold without small-model scaling", () => {
    assert.equal(getAutoCompactThreshold(262144), 232760);
    assert.equal(getAutoCompactThreshold(1_000_000), 1_000_000 - 16384 - 13000);
  });

  it("clears old tool results while keeping recent turns", () => {
    const messages: ChatMessage[] = [
      { role: "user", content: "1" },
      {
        role: "assistant",
        content: "a",
        toolCalls: [{ id: "1", name: "Bash", arguments: "{}" }],
      },
      { role: "tool", toolCallId: "1", name: "Bash", content: "old-output", isError: false },
      { role: "user", content: "2" },
      {
        role: "assistant",
        content: "b",
        toolCalls: [{ id: "2", name: "Bash", arguments: "{}" }],
      },
      { role: "tool", toolCallId: "2", name: "Bash", content: "mid", isError: false },
      { role: "user", content: "3" },
      {
        role: "assistant",
        content: "c",
        toolCalls: [{ id: "3", name: "Bash", arguments: "{}" }],
      },
      { role: "tool", toolCallId: "3", name: "Bash", content: "recent", isError: false },
      {
        role: "assistant",
        content: "d",
        toolCalls: [{ id: "4", name: "Bash", arguments: "{}" }],
      },
      { role: "tool", toolCallId: "4", name: "Bash", content: "newest", isError: false },
    ];
    const compacted = microCompactMessages(messages);
    assert.equal(
      (compacted.find((message) => message.role === "tool" && message.toolCallId === "1") as { content: string })
        .content,
      "[Old tool result content cleared]",
    );
    assert.equal(
      (compacted.find((message) => message.role === "tool" && message.toolCallId === "4") as { content: string })
        .content,
      "newest",
    );
    assert.ok(countClearedToolResults(messages, compacted) >= 1);
  });

  it("opens the compact circuit after repeated failures", () => {
    assert.ok(shouldAutoCompact(999_999, 262144, undefined, 0));
    assert.ok(!shouldAutoCompact(999_999, 262144, undefined, MAX_COMPACT_FAILURES));
  });
});
