import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { runShell } from "../utils/shell.js";

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const processAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

const waitForPidFile = async (path: string, timeoutMs: number): Promise<number> => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const raw = (await readFile(path, "utf8")).trim();
      const pid = Number(raw);
      if (Number.isFinite(pid) && pid > 0) {
        return pid;
      }
    } catch {
      // file not ready
    }
    await sleep(50);
  }
  throw new Error(`pid file not ready: ${path}`);
};

describe("runShell abort", () => {
  it("aborts sleep quickly and marks aborted", async () => {
    const controller = new AbortController();
    const started = Date.now();
    const pending = runShell("sleep 60", 120_000, controller.signal);
    await sleep(150);
    controller.abort();
    const result = await pending;
    assert.equal(result.aborted, true);
    assert.equal(result.exitCode, 130);
    assert.ok(Date.now() - started < 5_000);
  });

  it("kills nested child processes on abort", async () => {
    const dir = await mkdtemp(join(tmpdir(), "perception-shell-abort-"));
    const pidFile = join(dir, "child.pid");
    const controller = new AbortController();
    try {
      const pending = runShell(
        `bash -c 'sleep 120 & echo $! > "${pidFile}"; wait'`,
        120_000,
        controller.signal,
      );
      const childPid = await waitForPidFile(pidFile, 5_000);
      assert.equal(processAlive(childPid), true);
      controller.abort();
      const result = await pending;
      assert.equal(result.aborted, true);
      await sleep(300);
      assert.equal(processAlive(childPid), false);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("times out and kills the process tree", async () => {
    const started = Date.now();
    const result = await runShell("sleep 60", 400);
    assert.equal(result.timedOut, true);
    assert.equal(result.exitCode, 124);
    assert.ok(Date.now() - started < 5_000);
  });

  it("returns on shell exit without waiting for background grandchild stdio", async () => {
    const started = Date.now();
    const result = await runShell("sleep 30 &", 10_000);
    assert.equal(result.exitCode, 0);
    assert.equal(result.aborted, false);
    assert.ok(Date.now() - started < 5_000);
  });

  it("force-settles abort while a long daemon holds the tool", async () => {
    const controller = new AbortController();
    const started = Date.now();
    const pending = runShell("while true; do sleep 1; done", 120_000, controller.signal);
    await sleep(200);
    controller.abort();
    const result = await pending;
    assert.equal(result.aborted, true);
    assert.equal(result.exitCode, 130);
    assert.ok(Date.now() - started < 5_000);
  });
});
