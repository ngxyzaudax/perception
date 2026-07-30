import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ensureNonEmptyAssistantContent,
  isEmptyAssistantContent,
  isEmptyTurn,
  NO_CONTENT_MESSAGE,
  normalizeEmptyAssistantTurn,
} from "../query/emptyAssistantTurn.js";
import { toOpenAiMessages } from "../services/llm/adapters.js";
import type { ChatMessage } from "../types/messages.js";

describe("empty assistant turn", () => {
  it("detects empty and placeholder content", () => {
    assert.equal(isEmptyAssistantContent(""), true);
    assert.equal(isEmptyAssistantContent("   "), true);
    assert.equal(isEmptyAssistantContent(NO_CONTENT_MESSAGE), true);
    assert.equal(isEmptyAssistantContent("hello"), false);
  });

  it("normalizes empty turns to a placeholder", () => {
    const normalized = normalizeEmptyAssistantTurn({
      message: { role: "assistant", content: "" },
      toolCalls: [],
      finishReason: "stop",
    });
    assert.equal(normalized.message.content, NO_CONTENT_MESSAGE);
    assert.equal(isEmptyTurn(normalized), false);
  });

  it("leaves tool-only turns unchanged", () => {
    const turn = {
      message: {
        role: "assistant" as const,
        content: "",
        toolCalls: [{ id: "1", name: "Bash", arguments: "{}" }],
      },
      toolCalls: [{ id: "1", name: "Bash", arguments: "{}" }],
      finishReason: "tool_calls" as string | null,
    };
    assert.equal(normalizeEmptyAssistantTurn(turn), turn);
  });

  it("fills non-final empty assistants before api serialization", () => {
    const messages: ChatMessage[] = [
      { role: "user", content: "hi" },
      { role: "assistant", content: "" },
      { role: "user", content: "continue" },
      { role: "assistant", content: "" },
    ];
    const fixed = ensureNonEmptyAssistantContent(messages);
    assert.equal(fixed[1]?.content, NO_CONTENT_MESSAGE);
    assert.equal(fixed[3]?.content, "");
    const api = toOpenAiMessages(fixed);
    const midAssistant = api.find(
      (entry) => entry.role === "assistant" && entry.content === NO_CONTENT_MESSAGE,
    );
    assert.ok(midAssistant);
  });
});
