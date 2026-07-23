import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createQuestionResolver,
  settleQuestionAnswer,
  settleQuestionCancel,
  type PendingQuestion,
} from "../screens/permissionResolver.js";

describe("question resolver", () => {
  it("resolves selected answers", async () => {
    let pending: PendingQuestion | null = null;
    const request = createQuestionResolver((update) => {
      pending = typeof update === "function" ? update(pending) : update;
    });
    const answerPromise = request("pick one", [
      { label: "a" },
      { label: "b", description: "second" },
    ]);
    assert.ok(pending);
    assert.equal(pending?.options[1]?.description, "second");
    settleQuestionAnswer(pending, "b");
    pending = null;
    assert.equal(await answerPromise, "b");
  });

  it("rejects when cancelled", async () => {
    let pending: PendingQuestion | null = null;
    const request = createQuestionResolver((update) => {
      pending = typeof update === "function" ? update(pending) : update;
    });
    const answerPromise = request("pick one", [{ label: "a" }, { label: "b" }]);
    settleQuestionCancel(pending);
    await assert.rejects(answerPromise, /question cancelled/);
  });

  it("rejects when abort signal fires", async () => {
    let pending: PendingQuestion | null = null;
    const request = createQuestionResolver((update) => {
      pending = typeof update === "function" ? update(pending) : update;
    });
    const controller = new AbortController();
    const answerPromise = request(
      "pick one",
      [{ label: "a" }, { label: "b" }],
      controller.signal,
    );
    controller.abort();
    await assert.rejects(answerPromise, /question cancelled/);
  });
});
