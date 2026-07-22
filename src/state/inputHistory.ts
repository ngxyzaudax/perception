import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { perceptionHome } from "../services/sessions/sessionPaths.js";

const historyPath = (): string => join(perceptionHome(), "history.jsonl");
const maxEntries = 100;

export const loadInputHistory = async (): Promise<string[]> => {
  try {
    const raw = await readFile(historyPath(), "utf8");
    return raw
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .slice(-maxEntries);
  } catch {
    return [];
  }
};

export const appendInputHistory = async (entry: string): Promise<void> => {
  const trimmed = entry.trim();
  if (trimmed.length === 0) {
    return;
  }
  await mkdir(perceptionHome(), { recursive: true });
  const history = await loadInputHistory();
  const next = [...history.filter((item) => item !== trimmed), trimmed].slice(-maxEntries);
  await writeFile(historyPath(), `${next.join("\n")}\n`, "utf8");
};

export const persistInputHistoryEntry = async (entry: string): Promise<void> => {
  await appendInputHistory(entry);
};
