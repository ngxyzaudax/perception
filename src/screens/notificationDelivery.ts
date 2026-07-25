import type { AgentNotification } from "../state/agentNotifications.js";
import type { ChatMessage } from "../types/messages.js";

export type NotificationDelivery = {
  bindSubmit: (submit: (messages: ChatMessage[]) => Promise<void>) => void;
  bindState: (messages: ChatMessage[], busy: boolean) => void;
  updateMessages: (messages: ChatMessage[]) => void;
  notify: () => void;
};

export type NotificationDeliveryDeps = {
  dequeue: () => AgentNotification | null;
  restore: (notification: AgentNotification) => void;
  wakeFromSleep: () => void;
  onlySleepRunning: () => boolean;
};

export const createNotificationDelivery = (
  deps: NotificationDeliveryDeps,
): NotificationDelivery => {
  let busy = false;
  let submitting = false;
  let submitReady = false;
  let messages: ChatMessage[] = [];
  let submit = async (_messages: ChatMessage[]): Promise<void> => {};

  function drain(): void {
    if (busy || submitting || !submitReady) {
      return;
    }
    const notification = deps.dequeue();
    if (!notification) {
      return;
    }
    submitting = true;
    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: notification.content },
    ];
    void submit(nextMessages).then(
      () => {
        submitting = false;
        drain();
      },
      () => {
        submitting = false;
        deps.restore(notification);
      },
    );
  }

  return {
    bindSubmit: (
      nextSubmit: (messages: ChatMessage[]) => Promise<void>,
    ): void => {
      submit = nextSubmit;
      submitReady = true;
      drain();
    },
    bindState: (nextMessages: ChatMessage[], nextBusy: boolean): void => {
      messages = nextMessages;
      busy = nextBusy;
      if (!busy) {
        drain();
      }
    },
    updateMessages: (nextMessages: ChatMessage[]): void => {
      messages = nextMessages;
    },
    notify: (): void => {
      if (busy && deps.onlySleepRunning()) {
        deps.wakeFromSleep();
      }
      drain();
    },
  };
};
