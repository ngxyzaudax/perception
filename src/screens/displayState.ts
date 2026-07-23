import type { ChatMessage } from "../types/messages.js";
import type { DisplayMessage } from "../types/displayMessages.js";
import { appendStatusMessage, isStatusMessage } from "../types/displayMessages.js";

export const extractChatMessages = (display: DisplayMessage[]): ChatMessage[] =>
  display.filter((message): message is ChatMessage => message.role !== "status");

const messagesEqual = (left: ChatMessage, right: ChatMessage): boolean => {
  if (left.role !== right.role) {
    return false;
  }
  if (left.role === "tool" && right.role === "tool") {
    return left.toolCallId === right.toolCallId && left.content === right.content && left.name === right.name;
  }
  if (left.role === "assistant" && right.role === "assistant") {
    return left.content === right.content;
  }
  return left.content === right.content;
};

export const appendChatMessage = (
  display: DisplayMessage[],
  message: ChatMessage,
): DisplayMessage[] => [...display, message];

export const replaceChatMessages = (
  display: DisplayMessage[],
  chatMessages: ChatMessage[],
): DisplayMessage[] => {
  const chatEntries = extractChatMessages(display);
  const isAppendOnly =
    chatEntries.length <= chatMessages.length &&
    chatEntries.every((message, index) => messagesEqual(message, chatMessages[index]!));
  if (isAppendOnly) {
    return [...display, ...chatMessages.slice(chatEntries.length)];
  }
  return [...chatMessages];
};

export const syncChatMessages = (
  display: DisplayMessage[],
  chatMessages: ChatMessage[],
): DisplayMessage[] => {
  const chatEntries = extractChatMessages(display);
  const isAppendOnly =
    chatEntries.length <= chatMessages.length &&
    chatEntries.every((message, index) => messagesEqual(message, chatMessages[index]!));
  if (isAppendOnly) {
    return [...display, ...chatMessages.slice(chatEntries.length)];
  }
  const lastIndex = chatEntries.length - 1;
  if (
    lastIndex >= 0 &&
    chatEntries.length <= chatMessages.length &&
    chatEntries.slice(0, lastIndex).every((message, index) => messagesEqual(message, chatMessages[index]!)) &&
    chatEntries[lastIndex]?.role === "user" &&
    chatMessages[lastIndex]?.role === "user"
  ) {
    const statusMessages = display.filter(isStatusMessage);
    const mergedChat = [
      ...chatEntries.slice(0, lastIndex),
      chatMessages[lastIndex]!,
      ...chatMessages.slice(lastIndex + 1),
    ];
    return [...mergedChat, ...statusMessages];
  }
  return replaceChatMessages(display, chatMessages);
};

export const reconcileChatMessages = (
  display: DisplayMessage[],
  chatMessages: ChatMessage[],
): DisplayMessage[] => {
  const chatEntries = extractChatMessages(display);
  const isAppendOnly =
    chatEntries.length <= chatMessages.length &&
    chatEntries.every((message, index) => messagesEqual(message, chatMessages[index]!));
  if (isAppendOnly) {
    return [...display, ...chatMessages.slice(chatEntries.length)];
  }
  return display;
};

export const appendStatus = (
  display: DisplayMessage[],
  content: string,
  title?: string,
): DisplayMessage[] => appendStatusMessage(display, content, title);

export const clearDisplay = (): DisplayMessage[] => [];
