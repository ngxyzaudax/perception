import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
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
});
