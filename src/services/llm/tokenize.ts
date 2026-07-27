import { createHash } from "node:crypto";
import type { Settings } from "../../schemas/settings.js";
import type { ChatMessage } from "../../types/messages.js";
import { estimateMessageChars } from "../compact/autoCompact.js";

const CACHE_MAX_ENTRIES = 2000;
const REQUEST_TIMEOUT_MS = 3000;
const ESTIMATED_CHARS_PER_TOKEN = 4;

const UNAVAILABLE_RETRY_MS = 60000;

const MIN_CHARS_PER_TOKEN = 2;
const MAX_CHARS_PER_TOKEN = 6;

const tokenCountCache = new Map<string, number>();
let unavailableUntil = 0;
let calibrationChars = 0;
let calibrationTokens = 0;

export const calibratedCharsPerToken = (): number => {
  if (calibrationTokens < 1000) {
    return ESTIMATED_CHARS_PER_TOKEN;
  }
  const ratio = calibrationChars / calibrationTokens;
  return Math.min(MAX_CHARS_PER_TOKEN, Math.max(MIN_CHARS_PER_TOKEN, ratio));
};

const isEndpointUnavailable = (): boolean => Date.now() < unavailableUntil;

const markEndpointUnavailable = (): void => {
  unavailableUntil = Date.now() + UNAVAILABLE_RETRY_MS;
};

export const tokenizeEndpointUrl = (baseUrl: string): string =>
  `${baseUrl.replace(/\/v1\/?$/, "")}/tokenize`;

const cacheKey = (text: string): string =>
  createHash("sha256").update(text).digest("hex");

const rememberCount = (key: string, count: number): void => {
  if (tokenCountCache.size >= CACHE_MAX_ENTRIES) {
    const oldest = tokenCountCache.keys().next().value;
    if (oldest !== undefined) {
      tokenCountCache.delete(oldest);
    }
  }
  tokenCountCache.set(key, count);
};

export const countTextTokens = async (
  settings: Settings,
  text: string,
): Promise<number | null> => {
  if (isEndpointUnavailable()) {
    return null;
  }
  if (text.length === 0) {
    return 0;
  }
  const key = cacheKey(text);
  const cached = tokenCountCache.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const count = await requestTokenCount(settings, text);
  if (count === null) {
    markEndpointUnavailable();
    return null;
  }
  if (count > 0) {
    calibrationChars += text.length;
    calibrationTokens += count;
  }
  rememberCount(key, count);
  return count;
};

const requestTokenCount = async (
  settings: Settings,
  text: string,
): Promise<number | null> => {
  try {
    const response = await fetch(tokenizeEndpointUrl(settings.baseUrl), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: settings.model, prompt: text }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as { count?: number };
    return typeof payload.count === "number" ? payload.count : null;
  } catch {
    return null;
  }
};

export const messageText = (message: ChatMessage): string => {
  const toolCallText =
    message.role === "assistant" && message.toolCalls
      ? message.toolCalls.map((call) => `${call.name}${call.arguments}`).join("")
      : "";
  return `${message.content ?? ""}${toolCallText}`;
};

export const countMessagesTokens = async (
  settings: Settings,
  messages: ChatMessage[],
): Promise<number | null> =>
  countTextTokens(settings, messages.map(messageText).join("\n"));

export const estimateOrCountTokens = async (
  settings: Settings,
  messages: ChatMessage[],
): Promise<number> => {
  const counted = await countMessagesTokens(settings, messages);
  if (counted !== null) {
    return counted;
  }
  const chars = messages.reduce(
    (total, message) => total + estimateMessageChars(message),
    0,
  );
  return Math.ceil(chars / ESTIMATED_CHARS_PER_TOKEN);
};

export const resetTokenizeStateForTests = (): void => {
  tokenCountCache.clear();
  unavailableUntil = 0;
  calibrationChars = 0;
  calibrationTokens = 0;
};
