import assert from "node:assert";
import { describe, it } from "node:test";
import { formatTaskNotification } from "../state/agentNotifications.js";
import {
  isTaskNotification,
  parseTaskNotification,
} from "../state/parseTaskNotification.js";

describe("parseTaskNotification", () => {
  it("detects task notification content", () => {
    const content = formatTaskNotification({
      agentId: "agent-1",
      agentName: "agent-alpha",
      description: "Count files",
      status: "completed",
      result: "42 files",
    });
    assert.ok(isTaskNotification(content));
    assert.ok(!isTaskNotification("hey"));
  });

  it("extracts fields from formatted notification", () => {
    const content = formatTaskNotification({
      agentId: "agent-1",
      agentName: "agent-alpha",
      description: "Count files",
      status: "failed",
      error: "boom",
    });
    const parsed = parseTaskNotification(content);
    assert.equal(parsed.agentId, "agent-1");
    assert.equal(parsed.agentName, "agent-alpha");
    assert.equal(parsed.status, "failed");
    assert.equal(parsed.summary, 'Agent "Count files" failed: boom');
    assert.equal(parsed.result, undefined);
  });

  it("extracts multiline results", () => {
    const content = formatTaskNotification({
      agentId: "agent-2",
      description: "Sum primes",
      status: "completed",
      result: "line one\nline two",
    });
    const parsed = parseTaskNotification(content);
    assert.equal(parsed.result, "line one\nline two");
  });
});
