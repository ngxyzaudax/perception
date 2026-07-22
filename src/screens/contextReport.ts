import { getUsage } from "../state/usage.js";

export const formatContextReport = (messageCount: number, memoryChars: number): string =>
  [
    `messages: ${messageCount}`,
    `memory chars: ${memoryChars}`,
    `prompt tokens: ${getUsage().promptTokens}`,
    `completion tokens: ${getUsage().completionTokens}`,
    `last prompt tokens: ${getUsage().lastPromptTokens}`,
    `requests: ${getUsage().requestCount}`,
    `throughput: ${getUsage().averageTokensPerSecond.toFixed(1)} tok/s`,
  ].join("\n");
