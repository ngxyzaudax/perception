import { useCallback, useEffect, useMemo, useRef } from "react";
import { subscribeNotifications } from "../state/agentNotifications.js";
import type { ChatMessage } from "../types/messages.js";

export type NotificationController = {
  bindSubmit: (submit: (messages: ChatMessage[]) => Promise<void>) => void;
  bindBusy: (busy: boolean) => void;
  bindMessages: (messages: ChatMessage[]) => void;
};

export const useNotifications = (): NotificationController => {
  const pendingRef = useRef<string[]>([]);
  const busyRef = useRef(false);
  const messagesRef = useRef<ChatMessage[]>([]);
  const submitRef = useRef<(messages: ChatMessage[]) => Promise<void>>(async () => {});

  const drainNotification = useCallback((): void => {
    if (busyRef.current || pendingRef.current.length === 0) {
      return;
    }
    const content = pendingRef.current[0];
    if (!content) {
      return;
    }
    pendingRef.current = pendingRef.current.slice(1);
    const nextMessages: ChatMessage[] = [
      ...messagesRef.current,
      { role: "user", content },
    ];
    void submitRef.current(nextMessages).catch(() => {});
  }, []);

  useEffect(() => {
    return subscribeNotifications((notification) => {
      pendingRef.current.push(notification.content);
      drainNotification();
    });
  }, [drainNotification]);

  const bindSubmit = useCallback((submit: (messages: ChatMessage[]) => Promise<void>): void => {
    submitRef.current = submit;
  }, []);

  const bindBusy = useCallback((busy: boolean): void => {
    busyRef.current = busy;
    if (!busy) {
      drainNotification();
    }
  }, [drainNotification]);

  const bindMessages = useCallback((messages: ChatMessage[]): void => {
    messagesRef.current = messages;
  }, []);

  return useMemo(
    () => ({ bindSubmit, bindBusy, bindMessages }),
    [bindBusy, bindMessages, bindSubmit],
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
