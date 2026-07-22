import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  createWorkItem,
  getWorkItem,
  listWorkItems,
  updateWorkItem,
} from "../services/workItems/workItemStore.js";

describe("work items", () => {
  it("creates, updates, and lists work items", async () => {
    const root = await mkdtemp(join(tmpdir(), "perception-workitems-"));
    const previousCwd = process.cwd();
    try {
      process.chdir(root);
      const created = await createWorkItem("session-1", {
        subject: "Implement auth",
        description: "Add login flow",
      });
      assert.equal(created.status, "pending");
      const updated = await updateWorkItem("session-1", created.id, {
        status: "in_progress",
        addBlockedBy: ["2"],
      });
      assert.equal(updated?.status, "in_progress");
      assert.deepEqual(updated?.blockedBy, ["2"]);
      const listed = await listWorkItems("session-1");
      assert.equal(listed.length, 1);
      const loaded = await getWorkItem("session-1", created.id);
      assert.equal(loaded?.subject, "Implement auth");
    } finally {
      process.chdir(previousCwd);
      await rm(root, { recursive: true, force: true });
    }
  });
});
