import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  appendChatMessage,
  reconcileChatMessages,
  syncChatMessages,
} from "../screens/displayState.js";

describe("syncChatMessages", () => {
  it("updates optimistic user message content", () => {
    const display = appendChatMessage([], { role: "user", content: "hi" });
    const synced = syncChatMessages(display, [{ role: "user", content: "hi expanded" }]);
    assert.equal(synced.length, 1);
    assert.equal(synced[0]?.role, "user");
    if (synced[0]?.role === "user") {
      assert.equal(synced[0].content, "hi expanded");
    }
  });
});

describe("reconcileChatMessages", () => {
  it("appends new tail messages when history is append-only", () => {
    const display = appendChatMessage([], { role: "user", content: "hi" });
    const reconciled = reconcileChatMessages(display, [
      { role: "user", content: "hi" },
      { role: "assistant", content: "hello" },
    ]);
    assert.equal(reconciled.length, 2);
    assert.equal(reconciled[1]?.role, "assistant");
  });

  it("preserves display when history was compacted", () => {
    const display = [
      appendChatMessage([], { role: "user", content: "fix the build" }),
      [{ role: "assistant" as const, content: "working on it" }],
    ].flat();
    const compacted = reconcileChatMessages(display, [
      { role: "user", content: "Context summary of the previous conversation: ..." },
      { role: "assistant", content: "Understood. Continuing from the summarized context." },
    ]);
    assert.equal(compacted.length, 2);
    assert.equal(compacted[0], display[0]);
    assert.equal(compacted[1], display[1]);
  });
});
