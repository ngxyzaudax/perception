import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createRateLimitedStatusSetter } from "../terminal/rateLimitedStatus.js";

describe("createRateLimitedStatusSetter", () => {
  it("skips identical consecutive statuses", async () => {
    const values: string[] = [];
    const push = createRateLimitedStatusSetter((status) => values.push(status));
    push("running Read");
    push("running Read");
    await new Promise((resolve) => setTimeout(resolve, 40));
    assert.deepEqual(values, ["running Read"]);
  });
});
