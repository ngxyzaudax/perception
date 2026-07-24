import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cancelAllPermissions,
  createPermissionResolver,
  createQuestionResolver,
  PERMISSION_CANCELLED,
  permissionCancelledResult,
  settleQuestionAnswer,
  settleQuestionCancel,
  type PendingPermission,
  type PendingQuestion,
} from "../screens/permissionResolver.js";

describe("question resolver", () => {
  it("resolves selected answers", async () => {
    const captured = { pending: null as PendingQuestion | null };
    const request = createQuestionResolver((update) => {
      captured.pending = typeof update === "function" ? update(captured.pending) : update;
    });
    const answerPromise = request("pick one", [
      { label: "a" },
      { label: "b", description: "second" },
    ]);
    assert.ok(captured.pending);
    assert.equal(captured.pending.options[1]?.description, "second");
    settleQuestionAnswer(captured.pending, "b");
    assert.equal(await answerPromise, "b");
  });

  it("rejects when cancelled", async () => {
    const captured = { pending: null as PendingQuestion | null };
    const request = createQuestionResolver((update) => {
      captured.pending = typeof update === "function" ? update(captured.pending) : update;
    });
    const answerPromise = request("pick one", [{ label: "a" }, { label: "b" }]);
    settleQuestionCancel(captured.pending);
    await assert.rejects(answerPromise, /question cancelled/);
  });

  it("rejects when abort signal fires", async () => {
    const captured = { pending: null as PendingQuestion | null };
    const request = createQuestionResolver((update) => {
      captured.pending = typeof update === "function" ? update(captured.pending) : update;
    });
    const controller = new AbortController();
    const answerPromise = request(
      "pick one",
      [{ label: "a" }, { label: "b" }],
      controller.signal,
    );
    controller.abort("user-cancel");
    await assert.rejects(answerPromise, /question cancelled/);
  });
});

describe("permission resolver", () => {
  it("resolves granted permission", async () => {
    let queue: PendingPermission[] = [];
    const request = createPermissionResolver((update) => {
      queue = typeof update === "function" ? update(queue) : update;
    });
    const resultPromise = request({ toolName: "Bash", summary: "git status" });
    assert.equal(queue.length, 1);
    queue[0]?.resolve({ granted: true });
    assert.equal((await resultPromise).granted, true);
  });

  it("denies when abort signal fires", async () => {
    let queue: PendingPermission[] = [];
    const request = createPermissionResolver((update) => {
      queue = typeof update === "function" ? update(queue) : update;
    });
    const controller = new AbortController();
    const resultPromise = request(
      { toolName: "Bash", summary: "git status" },
      controller.signal,
    );
    controller.abort("user-cancel");
    const result = await resultPromise;
    assert.equal(result.granted, false);
    if (!result.granted) {
      assert.equal(result.reason, PERMISSION_CANCELLED);
    }
  });

  it("denies immediately when signal already aborted", async () => {
    let queue: PendingPermission[] = [];
    const request = createPermissionResolver((update) => {
      queue = typeof update === "function" ? update(queue) : update;
    });
    const controller = new AbortController();
    controller.abort("user-cancel");
    const result = await request(
      { toolName: "Bash", summary: "git status" },
      controller.signal,
    );
    assert.deepEqual(result, permissionCancelledResult());
    assert.equal(queue.length, 0);
  });

  it("cancels all queued permissions", async () => {
    let queue: PendingPermission[] = [];
    const request = createPermissionResolver((update) => {
      queue = typeof update === "function" ? update(queue) : update;
    });
    const first = request({ toolName: "Bash", summary: "git status" });
    const second = request({ toolName: "Read", summary: "README.md" });
    assert.equal(queue.length, 2);
    cancelAllPermissions(queue);
    queue = [];
    const firstResult = await first;
    const secondResult = await second;
    assert.equal(firstResult.granted, false);
    assert.equal(secondResult.granted, false);
  });
});
