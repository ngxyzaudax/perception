export type UsageRecord = {
  promptTokens: number;
  completionTokens: number;
  generationMs: number;
};

export type UsageSnapshot = {
  promptTokens: number;
  completionTokens: number;
  requestCount: number;
  lastPromptTokens: number;
  lastTokensPerSecond: number;
  averageTokensPerSecond: number;
};

let promptTokens = 0;
let completionTokens = 0;
let requestCount = 0;
let lastPromptTokens = 0;
let lastTokensPerSecond = 0;
let totalGenerationMs = 0;
let totalCompletionTokens = 0;

export const recordUsage = (record: UsageRecord): UsageSnapshot => {
  promptTokens += record.promptTokens;
  completionTokens += record.completionTokens;
  requestCount += 1;
  lastPromptTokens = record.promptTokens;
  totalGenerationMs += record.generationMs;
  totalCompletionTokens += record.completionTokens;
  lastTokensPerSecond = computeTokensPerSecond(record.completionTokens, record.generationMs);
  return getUsage();
};

export const getUsage = (): UsageSnapshot => ({
  promptTokens,
  completionTokens,
  requestCount,
  lastPromptTokens,
  lastTokensPerSecond,
  averageTokensPerSecond: computeTokensPerSecond(totalCompletionTokens, totalGenerationMs),
});

export const resetUsage = (): void => {
  promptTokens = 0;
  completionTokens = 0;
  requestCount = 0;
  lastPromptTokens = 0;
  lastTokensPerSecond = 0;
  totalGenerationMs = 0;
  totalCompletionTokens = 0;
};

const computeTokensPerSecond = (tokens: number, generationMs: number): number => {
  if (generationMs <= 0 || tokens <= 0) {
    return 0;
  }
  return tokens / (generationMs / 1000);
};
