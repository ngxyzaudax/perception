import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { trimToTokenBudget, enforceContextBudget, estimateTokens } from "../query/contextBudget.js";
import type { ChatMessage } from "../types/messages.js";

const chars = (count: number): string => "a".repeat(count);

describe("trimToTokenBudget", () => {
  it("returns history unchanged when it fits the budget", () => {
    const messages: ChatMessage[] = [
      { role: "system", content: "sys" },
      { role: "user", content: "hello" },
      { role: "assistant", content: "hi" },
    ];
    assert.deepEqual(trimToTokenBudget(messages, 1000), messages);
  });

  it("keeps the system message and drops oldest turns at user boundaries", () => {
    const messages: ChatMessage[] = [
      { role: "system", content: "sys" },
      { role: "user", content: chars(4000) },
      { role: "assistant", content: chars(4000) },
      { role: "user", content: chars(40) },
      { role: "assistant", content: chars(40) },
    ];
    const trimmed = trimToTokenBudget(messages, 100);
    assert.equal(trimmed[0]?.role, "system");
    assert.equal(trimmed[1]?.role, "user");
    assert.equal(trimmed[1]?.content.length, 40);
    assert.equal(trimmed.length, 3);
  });

  it("never starts the kept body with an orphaned tool message", () => {
    const messages: ChatMessage[] = [
      { role: "system", content: "sys" },
      { role: "user", content: chars(4000) },
      { role: "assistant", content: chars(10), toolCalls: [{ id: "1", name: "Bash", arguments: "{}" }] },
      { role: "tool", toolCallId: "1", name: "Bash", content: chars(4000), isError: false },
      { role: "user", content: chars(20) },
      { role: "assistant", content: chars(20) },
    ];
    const trimmed = trimToTokenBudget(messages, 60);
    const body = trimmed.slice(1);
    assert.notEqual(body[0]?.role, "tool");
    assert.equal(body[0]?.role, "user");
  });

  it("keeps at least the final turn when it alone exceeds budget", () => {
    const messages: ChatMessage[] = [
      { role: "system", content: "sys" },
      { role: "user", content: chars(1000) },
      { role: "user", content: chars(80000) },
    ];
    const trimmed = trimToTokenBudget(messages, 100);
    assert.equal(trimmed.length, 2);
    assert.equal(trimmed[1]?.content.length, 80000);
  });

  it("collapses a huge many-message history under the send budget", () => {
    const messages: ChatMessage[] = [{ role: "system", content: "sys" }];
    for (let index = 0; index < 1100; index += 1) {
      messages.push({ role: "user", content: chars(20) });
      messages.push({ role: "tool", toolCallId: `${index}`, name: "Bash", content: chars(1200), isError: false });
    }
    const bounded = enforceContextBudget(messages, 262144);
    const tokens = bounded.reduce((sum, message) => sum + estimateTokens(message.content), 0);
    assert.ok(tokens <= Math.floor(262144 * 0.9));
    assert.equal(bounded[0]?.role, "system");
  });
});
