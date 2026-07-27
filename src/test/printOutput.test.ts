import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  finalAssistantText,
  formatEventLine,
  formatJsonResult,
  parseOutputFormat,
} from "../cli/printOutput.js";
import {
  checkToolPermission,
  createPermissionContext,
} from "../permissions/checkPermission.js";
import type { ChatMessage } from "../types/messages.js";

describe("print output", () => {
  it("parses output formats with text fallback", () => {
    assert.equal(parseOutputFormat("json"), "json");
    assert.equal(parseOutputFormat("stream-json"), "stream-json");
    assert.equal(parseOutputFormat("yaml"), "text");
    assert.equal(parseOutputFormat(undefined), "text");
  });

  it("formats events as single-line json", () => {
    const line = formatEventLine({ type: "text_delta", text: "hello\nworld" });
    assert.ok(!line.includes("\n"));
    const parsed = JSON.parse(line) as { type: string; text: string };
    assert.equal(parsed.type, "text_delta");
    assert.equal(parsed.text, "hello\nworld");
  });

  it("builds json result with final assistant text", () => {
    const messages: ChatMessage[] = [
      { role: "user", content: "hi" },
      { role: "assistant", content: "first" },
      { role: "assistant", content: "final answer" },
    ];
    assert.equal(finalAssistantText(messages), "final answer");
    const parsed = JSON.parse(
      formatJsonResult({ messages, reason: "completed", turnCount: 2 }),
    ) as {
      subtype: string;
      result: string;
      messages: ChatMessage[];
    };
    assert.equal(parsed.subtype, "success");
    assert.equal(parsed.result, "final answer");
    assert.equal(parsed.messages.length, 3);
  });

  it("denies mutating tools in default mode without a prompt handler", async () => {
    const context = createPermissionContext({ mode: "default" });
    const result = await checkToolPermission(context, "Bash", "rm file", false);
    assert.equal(result.granted, false);
  });

  it("still allows read-only tools in default mode headlessly", async () => {
    const context = createPermissionContext({ mode: "default" });
    const result = await checkToolPermission(context, "Read", "a.ts", true);
    assert.equal(result.granted, true);
  });
});
