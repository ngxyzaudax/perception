import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeBottomPadRows,
  estimateHistoryRows,
  estimateMessageRows,
} from "../components/layout/estimateHistoryRows.js";

describe("estimateHistoryRows", () => {
  it("counts banner rows when history is empty", () => {
    assert.equal(estimateHistoryRows([], 80), 5);
  });

  it("counts wrapped user message rows", () => {
    const rows = estimateMessageRows({ role: "user", content: "hello" }, 80);
    assert.equal(rows, 3);
  });

  it("pads to pin chrome at the bottom for short history", () => {
    assert.equal(computeBottomPadRows(40, 10, 6), 24);
  });

  it("keeps dynamic output under terminal height", () => {
    assert.equal(computeBottomPadRows(40, 0, 6), 33);
  });

  it("skips padding when history fills the viewport", () => {
    assert.equal(computeBottomPadRows(40, 50, 6), 0);
  });
});
