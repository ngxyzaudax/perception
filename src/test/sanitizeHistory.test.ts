import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sanitizeHistory } from "../query/sanitizeHistory.js";
import type { ChatMessage } from "../types/messages.js";

const assistantWithCall = (id: string, args: string): ChatMessage => ({
  role: "assistant",
  content: "",
  toolCalls: [{ id, name: "WebFetch", arguments: args }],
});

const toolResult = (id: string, content: string): ChatMessage => ({
  role: "tool",
  toolCallId: id,
  name: "WebFetch",
  content,
  isError: false,
});

describe("sanitizeHistory", () => {
  it("returns identical references when history is clean", () => {
    const messages: ChatMessage[] = [
      { role: "system", content: "sys" },
      { role: "user", content: "hi" },
      assistantWithCall("1", '{"url":"https://ok"}'),
      toolResult("1", "ok"),
    ];
    const sanitized = sanitizeHistory(messages);
    assert.equal(sanitized.length, messages.length);
    sanitized.forEach((message, index) => assert.equal(message, messages[index]));
  });

  it("repairs invalid tool-call arguments to empty object", () => {
    const messages: ChatMessage[] = [
      { role: "user", content: "go" },
      assistantWithCall("1", '{"max_chars": 10000, "url": "https://truncated'),
      toolResult("1", "Unterminated string in JSON"),
    ];
    const sanitized = sanitizeHistory(messages);
    const assistant = sanitized[1];
    assert.equal(assistant?.role, "assistant");
    if (assistant?.role === "assistant") {
      assert.equal(assistant.toolCalls?.[0]?.arguments, "{}");
      assert.doesNotThrow(() => JSON.parse(assistant.toolCalls![0]!.arguments));
    }
  });

  it("synthesizes a result for a tool call that has none", () => {
    const messages: ChatMessage[] = [
      { role: "user", content: "go" },
      assistantWithCall("1", "{}"),
      { role: "assistant", content: "next" },
    ];
    const sanitized = sanitizeHistory(messages);
    assert.equal(sanitized[2]?.role, "tool");
    assert.equal(sanitized[2]?.role === "tool" && sanitized[2].toolCallId, "1");
    assert.equal(sanitized[3]?.role, "assistant");
  });

  it("drops orphan tool messages with no preceding tool call", () => {
    const messages: ChatMessage[] = [
      { role: "user", content: "go" },
      toolResult("stale", "leftover"),
      { role: "assistant", content: "done" },
    ];
    const sanitized = sanitizeHistory(messages);
    assert.equal(sanitized.length, 2);
    assert.equal(sanitized[0]?.role, "user");
    assert.equal(sanitized[1]?.role, "assistant");
  });

  it("keeps only results matching the tool calls and in call order", () => {
    const messages: ChatMessage[] = [
      {
        role: "assistant",
        content: "",
        toolCalls: [
          { id: "a", name: "WebFetch", arguments: "{}" },
          { id: "b", name: "WebFetch", arguments: "{}" },
        ],
      },
      toolResult("b", "second"),
      toolResult("a", "first"),
      toolResult("unknown", "orphan"),
    ];
    const sanitized = sanitizeHistory(messages);
    assert.equal(sanitized.length, 3);
    assert.equal(sanitized[1]?.role === "tool" && sanitized[1].toolCallId, "a");
    assert.equal(sanitized[2]?.role === "tool" && sanitized[2].toolCallId, "b");
  });
});
