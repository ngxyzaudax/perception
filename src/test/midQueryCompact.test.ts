import assert from "node:assert";
import { describe, it } from "node:test";
import { shouldCompactWorking } from "../query/midQueryCompact.js";
import type { ChatMessage } from "../types/messages.js";

const userMessage = (chars: number): ChatMessage => ({
  role: "user",
  content: "a".repeat(chars),
});

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
});
