import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createNotificationDelivery } from "../screens/notificationDelivery.js";
import type { AgentNotification } from "../state/agentNotifications.js";
import type { ChatMessage } from "../types/messages.js";

const flushPromises = (): Promise<void> =>
  new Promise((resolve) => {
    setImmediate(resolve);
  });

const createQueue = () => {
  const queue: AgentNotification[] = [];
  return {
    queue,
    dequeue: (): AgentNotification | null => queue.shift() ?? null,
    restore: (notification: AgentNotification): void => {
      queue.unshift(notification);
    },
  };
};

describe("notification delivery", () => {
  it("replays queued completion after submit becomes ready", async () => {
    const notifications = createQueue();
    const submitted: ChatMessage[][] = [];
    notifications.queue.push({ agentId: "agent-1", content: "worker done" });
    const delivery = createNotificationDelivery({
      ...notifications,
      wakeFromSleep: () => {},
      onlySleepRunning: () => false,
    });
    delivery.bindState([{ role: "assistant", content: "previous answer" }], false);
    delivery.notify();
    delivery.bindSubmit(async (messages) => {
      submitted.push(messages);
    });
    await flushPromises();
    assert.equal(submitted.length, 1);
    assert.equal(submitted[0]?.at(-1)?.content, "worker done");
  });

  it("waits while busy and submits against latest history", async () => {
    const notifications = createQueue();
    const submitted: ChatMessage[][] = [];
    const delivery = createNotificationDelivery({
      ...notifications,
      wakeFromSleep: () => {},
      onlySleepRunning: () => false,
    });
    delivery.bindSubmit(async (messages) => {
      submitted.push(messages);
    });
    delivery.bindState([{ role: "user", content: "old" }], true);
    notifications.queue.push({ agentId: "agent-2", content: "completed" });
    delivery.notify();
    assert.equal(submitted.length, 0);
    delivery.bindState([{ role: "assistant", content: "latest" }], false);
    await flushPromises();
    assert.equal(submitted[0]?.[0]?.content, "latest");
    assert.equal(submitted[0]?.at(-1)?.content, "completed");
  });

  it("wakes an active Sleep without consuming the notification", () => {
    const notifications = createQueue();
    let wakeCount = 0;
    const delivery = createNotificationDelivery({
      ...notifications,
      wakeFromSleep: () => {
        wakeCount += 1;
      },
      onlySleepRunning: () => true,
    });
    delivery.bindSubmit(async () => {});
    delivery.bindState([], true);
    notifications.queue.push({ agentId: "agent-3", content: "wake" });
    delivery.notify();
    assert.equal(wakeCount, 1);
    assert.equal(notifications.queue.length, 1);
  });

  it("restores a notification when automatic submission fails", async () => {
    const notifications = createQueue();
    const delivery = createNotificationDelivery({
      ...notifications,
      wakeFromSleep: () => {},
      onlySleepRunning: () => false,
    });
    notifications.queue.push({ agentId: "agent-4", content: "retry later" });
    delivery.bindState([], false);
    delivery.bindSubmit(async () => {
      throw new Error("submit failed");
    });
    await flushPromises();
    assert.equal(notifications.queue[0]?.content, "retry later");
  });

  it("uses completed query history for the next notification", async () => {
    const notifications = createQueue();
    const submitted: ChatMessage[][] = [];
    const delivery = createNotificationDelivery({
      ...notifications,
      wakeFromSleep: () => {},
      onlySleepRunning: () => false,
    });
    notifications.queue.push(
      { agentId: "agent-5", content: "first" },
      { agentId: "agent-6", content: "second" },
    );
    delivery.bindState([], false);
    delivery.bindSubmit(async (messages) => {
      submitted.push(messages);
      delivery.updateMessages([
        ...messages,
        { role: "assistant", content: `handled ${messages.at(-1)?.content}` },
      ]);
    });
    await flushPromises();
    assert.equal(submitted.length, 2);
    assert.ok(submitted[1]?.some((message) => message.content === "handled first"));
    assert.equal(submitted[1]?.at(-1)?.content, "second");
  });
});
