import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { missingToolResults, sanitizeHistory } from "../query/sanitizeHistory.js";
import type { ChatMessage } from "../types/messages.js";

describe("abort pairing", () => {
  it("creates synthetic tool results for unpaired tool calls", () => {
    const assistant: ChatMessage = {
      role: "assistant",
      content: "",
      toolCalls: [
        { id: "1", name: "Bash", arguments: "{}" },
        { id: "2", name: "Read", arguments: "{}" },
      ],
    };
    const existing: ChatMessage[] = [
      { role: "tool", toolCallId: "1", name: "Bash", content: "done", isError: false },
    ];
    const missing = missingToolResults(assistant, existing);
    assert.equal(missing.length, 1);
    assert.equal(missing[0]?.toolCallId, "2");
    assert.equal(missing[0]?.isError, true);
  });

  it("heals history with synthetic results", () => {
    const messages: ChatMessage[] = [
      { role: "user", content: "go" },
      {
        role: "assistant",
        content: "",
        toolCalls: [{ id: "1", name: "Bash", arguments: "{}" }],
      },
    ];
    const healed = sanitizeHistory(messages);
    assert.equal(healed.length, 3);
    assert.equal(healed[2]?.role, "tool");
  });
});
