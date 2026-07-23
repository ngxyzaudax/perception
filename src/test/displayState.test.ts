import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { syncChatMessages, appendChatMessage } from "../screens/displayState.js";

describe("syncChatMessages", () => {
  it("updates optimistic user message content", () => {
    const display = appendChatMessage([], { role: "user", content: "hi" });
    const synced = syncChatMessages(display, [{ role: "user", content: "hi expanded" }]);
    assert.equal(synced.length, 1);
    assert.equal(synced[0]?.role, "user");
    if (synced[0]?.role === "user") {
      assert.equal(synced[0].content, "hi expanded");
    }
  });
});
