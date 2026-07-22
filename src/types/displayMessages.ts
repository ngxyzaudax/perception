import type { ChatMessage } from "./messages.js";

export type StatusMessage = {
  role: "status";
  content: string;
  title?: string;
};

export type DisplayMessage = ChatMessage | StatusMessage;

export const isStatusMessage = (message: DisplayMessage): message is StatusMessage =>
  message.role === "status";

export const appendStatusMessage = (
  messages: DisplayMessage[],
  content: string,
  title?: string,
): DisplayMessage[] => [...messages, { role: "status", content, title }];
