import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isBurstContinuation, isReadBurstTool } from "../screens/displayGrouping.js";
import { nextSpinnerMode, spinnerVerb } from "../screens/spinnerMode.js";
import type { DisplayMessage } from "../types/displayMessages.js";

const toolMessage = (name: string, isError = false): DisplayMessage => ({
  role: "tool",
  toolCallId: `${name}-id`,
  name,
  content: "output",
  isError,
});

describe("display grouping", () => {
  it("classifies read-burst tools", () => {
    assert.equal(isReadBurstTool(toolMessage("Read")), true);
    assert.equal(isReadBurstTool(toolMessage("Grep")), true);
    assert.equal(isReadBurstTool(toolMessage("Bash")), false);
    assert.equal(isReadBurstTool(toolMessage("Read", true)), false);
    assert.equal(isReadBurstTool({ role: "user", content: "hi" }), false);
  });

  it("collapses consecutive read tools after the first", () => {
    const messages: DisplayMessage[] = [
      { role: "user", content: "go" },
      toolMessage("Read"),
      toolMessage("Grep"),
      toolMessage("Glob"),
      toolMessage("Bash"),
      toolMessage("Read"),
    ];
    assert.equal(isBurstContinuation(messages, 1), false);
    assert.equal(isBurstContinuation(messages, 2), true);
    assert.equal(isBurstContinuation(messages, 3), true);
    assert.equal(isBurstContinuation(messages, 4), false);
    assert.equal(isBurstContinuation(messages, 5), false);
  });
});

describe("spinner mode machine", () => {
  it("transitions between modes by event type", () => {
    assert.equal(nextSpinnerMode("thinking", "text_delta"), "responding");
    assert.equal(nextSpinnerMode("responding", "tool_start"), "tool-use");
    assert.equal(nextSpinnerMode("tool-use", "reasoning_delta"), "thinking");
    assert.equal(nextSpinnerMode("responding", "message_complete"), "thinking");
    assert.equal(nextSpinnerMode("tool-use", "usage"), "tool-use");
    assert.equal(nextSpinnerMode("thinking", "tool_call_delta"), "tool-use");
  });

  it("maps modes to verbs", () => {
    assert.equal(spinnerVerb("thinking"), "Thinking");
    assert.equal(spinnerVerb("responding"), "Responding");
    assert.equal(spinnerVerb("tool-use"), "Running tools");
  });
});
