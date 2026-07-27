import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { runBackgroundShell } from "../services/tasks/runBackgroundShell.js";
import {
  drainNotifications,
  subscribeNotifications,
  type AgentNotification,
} from "../state/agentNotifications.js";
import {
  getTask,
  setActiveSessionId,
} from "../state/backgroundTasks.js";

const receiveNotification = (): {
  result: Promise<AgentNotification>;
  unsubscribe: () => void;
} => {
  let unsubscribe = (): void => undefined;
  const result = new Promise<AgentNotification>((resolve) => {
    unsubscribe = subscribeNotifications(resolve);
  });
  return { result, unsubscribe };
};

describe("background shell notifications", () => {
  it("notifies when a background command completes", async () => {
    const root = await mkdtemp(join(tmpdir(), "perception-background-"));
    const previousHome = process.env.PERCEPTION_HOME;
    process.env.PERCEPTION_HOME = root;
    setActiveSessionId("notification-test");
    drainNotifications();
    const pending = receiveNotification();
    try {
      const task = await runBackgroundShell("printf complete");
      const notification = await pending.result;
      assert.equal(notification.agentId, task.taskId);
      assert.match(notification.content, /<status>completed<\/status>/);
      assert.match(notification.content, new RegExp(task.outputPath));
      assert.equal(getTask(task.taskId)?.status, "completed");
      assert.equal(await readFile(task.outputPath, "utf8"), "complete");
    } finally {
      pending.unsubscribe();
      drainNotifications();
      if (previousHome === undefined) {
        delete process.env.PERCEPTION_HOME;
      } else {
        process.env.PERCEPTION_HOME = previousHome;
      }
      await rm(root, { recursive: true, force: true });
    }
  });
});
