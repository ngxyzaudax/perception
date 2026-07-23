import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  drainPendingNotification,
  peekPendingNotification,
} from "../screens/useNotifications.js";

describe("peekPendingNotification", () => {
  it("returns the first item without mutating the queue", () => {
    const pending = ["task done", "task two"];
    assert.equal(peekPendingNotification(pending), "task done");
    assert.equal(pending.length, 2);
  });
});

describe("drainPendingNotification", () => {
  it("returns the head item and remaining tail", () => {
    const first = drainPendingNotification(["a", "b"]);
    assert.equal(first.content, "a");
    assert.deepEqual(first.remaining, ["b"]);
  });
});
