import type { UsageSnapshot } from "../state/usage.js";

export const formatTokensReport = (usage: UsageSnapshot): string =>
  [
    `prompt tokens: ${usage.promptTokens}`,
    `completion tokens: ${usage.completionTokens}`,
    `requests: ${usage.requestCount}`,
    `last throughput: ${usage.lastTokensPerSecond.toFixed(1)} tok/s`,
    `average throughput: ${usage.averageTokensPerSecond.toFixed(1)} tok/s`,
  ].join("\n");

export const formatContextHeader = (
  lastPromptTokens: number,
  maxContextTokens: number,
): string => `ctx: ${lastPromptTokens}/${maxContextTokens}`;
