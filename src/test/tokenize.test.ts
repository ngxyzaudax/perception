import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calibratedCharsPerToken,
  countTextTokens,
  estimateOrCountTokens,
  messageText,
  resetTokenizeStateForTests,
  tokenizeEndpointUrl,
} from "../services/llm/tokenize.js";
import { settingsSchema } from "../schemas/settings.js";
import type { ChatMessage } from "../types/messages.js";

const unreachableSettings = settingsSchema.parse({
  baseUrl: "http://127.0.0.1:1/v1",
});

describe("tokenize", () => {
  it("derives the tokenize endpoint from the base url", () => {
    assert.equal(
      tokenizeEndpointUrl("http://localhost:8000/v1"),
      "http://localhost:8000/tokenize",
    );
    assert.equal(
      tokenizeEndpointUrl("http://localhost:8000/v1/"),
      "http://localhost:8000/tokenize",
    );
  });

  it("returns null when the endpoint is unavailable", async () => {
    resetTokenizeStateForTests();
    const count = await countTextTokens(unreachableSettings, "hello world");
    assert.equal(count, null);
  });

  it("falls back to chars/4 estimation", async () => {
    resetTokenizeStateForTests();
    const messages: ChatMessage[] = [{ role: "user", content: "x".repeat(400) }];
    const estimated = await estimateOrCountTokens(unreachableSettings, messages);
    assert.equal(estimated, 100);
  });

  it("includes tool call arguments in message text", () => {
    const message: ChatMessage = {
      role: "assistant",
      content: "run it",
      toolCalls: [{ id: "1", name: "Bash", arguments: '{"command":"ls"}' }],
    };
    assert.ok(messageText(message).includes('Bash{"command":"ls"}'));
  });

  it("uses the default ratio before calibration", () => {
    resetTokenizeStateForTests();
    assert.equal(calibratedCharsPerToken(), 4);
  });
});
