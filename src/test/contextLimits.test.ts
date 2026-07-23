import assert from "node:assert";
import { describe, it } from "node:test";
import { capToolOutput, shrinkOversizedToolMessages } from "../query/toolOutputLimits.js";
import { isContextOverflowError } from "../query/contextOverflow.js";
import { estimatePromptTokens } from "../services/compact/autoCompact.js";
import type { ChatMessage } from "../types/messages.js";

describe("capToolOutput", () => {
  it("returns short output unchanged", () => {
    assert.equal(capToolOutput("hello"), "hello");
  });

  it("truncates oversized output keeping head and tail", () => {
    const output = "a".repeat(100000);
    const capped = capToolOutput(output);
    assert.ok(capped.length < output.length);
    assert.ok(capped.includes("[output truncated: 100000 chars total"));
    assert.ok(capped.startsWith("a"));
    assert.ok(capped.endsWith("a"));
  });
});

describe("shrinkOversizedToolMessages", () => {
  it("shrinks only oversized tool messages", () => {
    const messages: ChatMessage[] = [
      { role: "user", content: "x".repeat(50000) },
      { role: "tool", toolCallId: "1", name: "Bash", content: "short", isError: false },
      { role: "tool", toolCallId: "2", name: "Bash", content: "y".repeat(50000), isError: false },
    ];
    const shrunk = shrinkOversizedToolMessages(messages);
    assert.equal(shrunk[0]?.content.length, 50000);
    assert.equal(shrunk[1]?.content, "short");
    assert.ok((shrunk[2]?.content.length ?? 0) < 3000);
    assert.ok(shrunk[2]?.content.includes("[output truncated"));
  });
});

describe("isContextOverflowError", () => {
  it("detects vllm context length errors", () => {
    const error = new Error(
      "400 This model's maximum context length is 262144 tokens. However, you requested 0 output tokens and your prompt contains at least 262145 input tokens.",
    );
    assert.ok(isContextOverflowError(error));
  });

  it("ignores unrelated errors", () => {
    assert.ok(!isContextOverflowError(new Error("ECONNRESET")));
    assert.ok(!isContextOverflowError("string error"));
  });
});

describe("estimatePromptTokens", () => {
  it("uses lastPromptTokens when larger than estimate", () => {
    const messages: ChatMessage[] = [{ role: "user", content: "hi" }];
    assert.equal(estimatePromptTokens(190500, messages), 190500);
  });

  it("uses char estimate when history grew past lastPromptTokens", () => {
    const messages: ChatMessage[] = [
      { role: "user", content: "a".repeat(400000) },
    ];
    assert.equal(estimatePromptTokens(1000, messages), 100000);
  });
});
