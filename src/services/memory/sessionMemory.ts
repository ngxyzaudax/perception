import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { ChatMessage } from "../../types/messages.js";
import { estimatePromptTokens, getAutoCompactThreshold } from "../compact/autoCompact.js";
import { trimToTokenBudget } from "../../query/contextBudget.js";
import { getCwd } from "../../utils/cwd.js";

const SUMMARY_PREFIX = "Context summary of the previous conversation:\n";
const RESUME_TAIL_BUDGET_RATIO = 0.5;

export const sessionMemoryPath = (sessionId: string): string =>
  join(getCwd(), ".perception", "memory", "sessions", `${sessionId}.md`);

export const saveSessionMemory = async (
  sessionId: string,
  summary: string,
): Promise<void> => {
  const path = sessionMemoryPath(sessionId);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, summary, "utf8");
};

export const loadSessionMemory = async (
  sessionId: string,
): Promise<string | null> => {
  try {
    const content = await readFile(sessionMemoryPath(sessionId), "utf8");
    return content.trim().length > 0 ? content : null;
  } catch {
    return null;
  }
};

export const summaryFromCompacted = (
  compacted: ChatMessage[],
): string | null => {
  const first = compacted[0];
  if (!first || first.role !== "user" || !first.content.startsWith(SUMMARY_PREFIX)) {
    return null;
  }
  return first.content.slice(SUMMARY_PREFIX.length);
};

export const persistCompactSummary = (
  sessionId: string | undefined,
  compacted: ChatMessage[],
): void => {
  if (!sessionId) {
    return;
  }
  const summary = summaryFromCompacted(compacted);
  if (summary) {
    void saveSessionMemory(sessionId, summary).catch(() => undefined);
  }
};

export const applySessionMemory = (
  messages: ChatMessage[],
  summary: string | null,
  maxContextTokens: number,
): ChatMessage[] => {
  if (!summary || messages.length === 0) {
    return messages;
  }
  const threshold = getAutoCompactThreshold(maxContextTokens);
  if (estimatePromptTokens(0, messages) <= threshold) {
    return messages;
  }
  const tail = trimToTokenBudget(
    messages,
    Math.floor(threshold * RESUME_TAIL_BUDGET_RATIO),
  );
  return [
    { role: "user", content: `${SUMMARY_PREFIX}${summary}` },
    { role: "assistant", content: "Understood. Continuing from the summarized context." },
    ...tail,
  ];
};
