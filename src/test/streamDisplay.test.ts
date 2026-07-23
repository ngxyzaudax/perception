import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createStreamingDisplay } from "../terminal/streamDisplay.js";

describe("createStreamingDisplay", () => {
  it("coalesces rapid append notifications", async () => {
    const display = createStreamingDisplay();
    let notifyCount = 0;
    display.subscribe(() => {
      notifyCount += 1;
    });
    display.appendText("a");
    display.appendText("b");
    display.appendText("c");
    assert.equal(notifyCount, 0);
    await new Promise((resolve) => setTimeout(resolve, 40));
    assert.equal(notifyCount, 1);
    assert.equal(display.getSnapshot().text, "abc");
  });

  it("flushes immediately on clear", () => {
    const display = createStreamingDisplay();
    let notifyCount = 0;
    display.subscribe(() => {
      notifyCount += 1;
    });
    display.appendText("hello");
    display.clear();
    assert.equal(notifyCount, 1);
    assert.equal(display.getSnapshot().text, "");
  });
});
