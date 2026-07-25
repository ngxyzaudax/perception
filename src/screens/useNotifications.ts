import { useEffect, useMemo, useRef } from "react";
import {
  dequeueNotification,
  restoreNotification,
  subscribeNotifications,
} from "../state/agentNotifications.js";
import { getRunningTools, type RunningTool } from "../state/runningTools.js";
import {
  createNotificationDelivery,
  type NotificationDelivery,
} from "./notificationDelivery.js";

export type NotificationController = Omit<NotificationDelivery, "notify">;

export const onlySleepToolRunning = (tools: RunningTool[]): boolean =>
  tools.length === 1 && tools[0]?.name === "Sleep" && tools[0].count === 1;

export const useNotifications = (
  wakeFromSleep: () => void,
): NotificationController => {
  const wakeFromSleepRef = useRef(wakeFromSleep);
  wakeFromSleepRef.current = wakeFromSleep;
  const deliveryRef = useRef<NotificationDelivery>();
  if (!deliveryRef.current) {
    deliveryRef.current = createNotificationDelivery({
      dequeue: dequeueNotification,
      restore: restoreNotification,
      wakeFromSleep: () => wakeFromSleepRef.current(),
      onlySleepRunning: () => onlySleepToolRunning(getRunningTools()),
    });
  }
  const delivery = deliveryRef.current;

  useEffect(() => {
    return subscribeNotifications(delivery.notify);
  }, [delivery]);

  return useMemo(
    () => ({
      bindSubmit: delivery.bindSubmit,
      bindState: delivery.bindState,
      updateMessages: delivery.updateMessages,
    }),
    [delivery],
  );
};

export const peekPendingNotification = (pending: string[]): string | null =>
  pending[0] ?? null;

export const shiftPendingNotification = (pending: string[]): string[] => pending.slice(1);

export const drainPendingNotification = (
  pending: string[],
): { content: string | null; remaining: string[] } => {
  const content = peekPendingNotification(pending);
  return { content, remaining: content ? shiftPendingNotification(pending) : pending };
};
