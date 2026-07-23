import type { ChatMessage } from "../types/messages.js";
import { shrinkOversizedToolMessages } from "./toolOutputLimits.js";

const CHARS_PER_TOKEN = 4;
const SEND_BUDGET_RATIO = 0.9;

export const estimateTokens = (text: string): number => Math.ceil(text.length / CHARS_PER_TOKEN);

const totalTokens = (messages: ChatMessage[]): number =>
  messages.reduce((sum, message) => sum + estimateTokens(message.content ?? ""), 0);

export const sendBudget = (maxContextTokens: number): number =>
  Math.floor(maxContextTokens * SEND_BUDGET_RATIO);

export const isWithinSendBudget = (
  messages: ChatMessage[],
  maxContextTokens: number,
): boolean => totalTokens(messages) <= sendBudget(maxContextTokens);

const userBoundaryStarts = (body: ChatMessage[]): number[] => {
  const starts: number[] = body[0]?.role === "user" ? [] : [0];
  body.forEach((message, index) => {
    if (message.role === "user") {
      starts.push(index);
    }
  });
  return [...new Set(starts)].sort((left, right) => left - right);
};

const suffixTokens = (body: ChatMessage[]): number[] => {
  const suffix = new Array<number>(body.length + 1).fill(0);
  for (let index = body.length - 1; index >= 0; index -= 1) {
    suffix[index] = suffix[index + 1]! + estimateTokens(body[index]!.content ?? "");
  }
  return suffix;
};

export const trimToTokenBudget = (
  messages: ChatMessage[],
  budgetTokens: number,
): ChatMessage[] => {
  if (messages.length <= 1) {
    return messages;
  }
  const hasSystem = messages[0]!.role === "system";
  const system = hasSystem ? messages.slice(0, 1) : [];
  const body = hasSystem ? messages.slice(1) : messages;
  if (body.length === 0) {
    return messages;
  }
  const remaining = Math.max(0, budgetTokens - totalTokens(system));
  const suffix = suffixTokens(body);
  const starts = userBoundaryStarts(body);
  const fallback = starts[starts.length - 1] ?? 0;
  const chosen = starts.find((start) => suffix[start]! <= remaining) ?? fallback;
  return [...system, ...body.slice(chosen)];
};

export const enforceContextBudget = (
  messages: ChatMessage[],
  maxContextTokens: number,
): ChatMessage[] => trimToTokenBudget(messages, Math.floor(maxContextTokens * SEND_BUDGET_RATIO));

export const recoverFromOverflow = (
  messages: ChatMessage[],
  maxContextTokens: number,
): ChatMessage[] => enforceContextBudget(shrinkOversizedToolMessages(messages), maxContextTokens);
