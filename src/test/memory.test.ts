import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { describe, it } from "node:test";
import {
  applySessionMemory,
  loadSessionMemory,
  saveSessionMemory,
  sessionMemoryPath,
  summaryFromCompacted,
} from "../services/memory/sessionMemory.js";
import { extractProjectMemory } from "../services/memory/extractProjectMemory.js";
import { settingsSchema } from "../schemas/settings.js";
import type { ChatMessage } from "../types/messages.js";

describe("session memory", () => {
  it("round-trips a compact summary to disk", async () => {
    const sessionId = `test-memory-${Date.now()}`;
    await saveSessionMemory(sessionId, "user fixed the parser");
    const loaded = await loadSessionMemory(sessionId);
    assert.equal(loaded, "user fixed the parser");
    await rm(sessionMemoryPath(sessionId), { force: true });
  });

  it("returns null for missing session memory", async () => {
    assert.equal(await loadSessionMemory("does-not-exist"), null);
  });

  it("extracts summary text from compacted messages", () => {
    const compacted: ChatMessage[] = [
      {
        role: "user",
        content: "Context summary of the previous conversation:\nthe summary body",
      },
      { role: "assistant", content: "Understood. Continuing from the summarized context." },
    ];
    assert.equal(summaryFromCompacted(compacted), "the summary body");
    assert.equal(summaryFromCompacted([{ role: "user", content: "hello" }]), null);
  });

  it("keeps small histories untouched on resume", () => {
    const messages: ChatMessage[] = [{ role: "user", content: "short" }];
    const resumed = applySessionMemory(messages, "summary", 200000);
    assert.equal(resumed, messages);
  });

  it("prepends stored summary when history exceeds budget", () => {
    const big = "x".repeat(400000);
    const messages: ChatMessage[] = [
      { role: "user", content: big },
      { role: "assistant", content: big },
      { role: "user", content: "latest question" },
    ];
    const resumed = applySessionMemory(messages, "stored summary", 128000);
    assert.notEqual(resumed, messages);
    assert.ok(resumed[0]?.content.includes("stored summary"));
    assert.ok(resumed.some((message) => message.content === "latest question"));
  });
});

describe("project memory extraction", () => {
  it("is gated off by default", async () => {
    const settings = settingsSchema.parse({});
    assert.equal(settings.memoryExtraction, false);
    const result = await extractProjectMemory(settings, [
      { role: "user", content: "remember this" },
    ]);
    assert.equal(result, null);
  });
});
