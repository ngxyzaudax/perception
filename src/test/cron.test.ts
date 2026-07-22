import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { nextCronFire, parseCronExpression } from "../services/cron/cronParser.js";
import { createCronJob, deleteCronJob, listCronJobs } from "../services/cron/cronStore.js";

describe("cron parser", () => {
  it("parses five-field expressions", () => {
    const parsed = parseCronExpression("0 9 * * *");
    assert.ok(parsed.minute.values.has(0));
    assert.ok(parsed.hour.values.has(9));
  });

  it("computes a future fire time", () => {
    const next = nextCronFire("0 9 * * *", new Date("2026-07-21T08:00:00"));
    assert.equal(next.getHours(), 9);
    assert.equal(next.getMinutes(), 0);
  });
});

describe("cron store", () => {
  it("creates and deletes jobs", async () => {
    const root = await mkdtemp(join(tmpdir(), "perception-cron-"));
    const previousCwd = process.cwd();
    try {
      process.chdir(root);
      const job = await createCronJob({
        cron: "0 9 * * *",
        prompt: "daily check",
        nextFireAt: new Date().toISOString(),
      });
      assert.equal(listCronJobs().length, 1);
      await deleteCronJob(job.id);
      assert.equal(listCronJobs().length, 0);
    } finally {
      process.chdir(previousCwd);
      await rm(root, { recursive: true, force: true });
    }
  });
});
