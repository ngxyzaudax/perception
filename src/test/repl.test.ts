import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resetVmSession, runVmCode } from "../services/repl/vmSession.js";

describe("repl vm session", () => {
  it("keeps state across runs", () => {
    resetVmSession("test");
    const first = runVmCode("test", "globalThis.count = 1", 1000);
    assert.equal(first.result, 1);
    const second = runVmCode("test", "globalThis.count += 2; globalThis.count", 1000);
    assert.equal(second.result, 3);
  });

  it("captures console output", () => {
    resetVmSession("console-test");
    const result = runVmCode("console-test", "console.log('hello')", 1000);
    assert.match(result.stdout, /hello/);
  });
});
