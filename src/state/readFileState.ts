import { stat } from "node:fs/promises";

export type FileReadEntry = {
  timestamp: number;
};

const state = new Map<string, Map<string, FileReadEntry>>();

const resolveScope = (scope: string = "main"): Map<string, FileReadEntry> => {
  const existing = state.get(scope);
  if (existing) {
    return existing;
  }
  const created = new Map<string, FileReadEntry>();
  state.set(scope, created);
  return created;
};

export const recordFileRead = (path: string, timestamp: number, scope: string = "main"): void => {
  resolveScope(scope).set(path, { timestamp });
};

export const getFileReadTimestamp = (path: string, scope: string = "main"): number | undefined =>
  resolveScope(scope).get(path)?.timestamp;

export const clearReadFileState = (scope: string = "main"): void => {
  state.delete(scope);
};

export const checkFileFreshness = async (
  path: string,
  scope: string = "main",
): Promise<string | null> => {
  let fileStat;
  try {
    fileStat = await stat(path);
  } catch {
    return null;
  }
  const readTimestamp = getFileReadTimestamp(path, scope);
  if (readTimestamp === undefined) {
    return `File has not been read yet. Read ${path} before editing.`;
  }
  if (fileStat.mtimeMs > readTimestamp) {
    return `File ${path} was modified after it was read. Read the file again before editing.`;
  }
  return null;
};

export const touchFileRead = async (path: string, scope: string = "main"): Promise<void> => {
  const fileStat = await stat(path);
  recordFileRead(path, fileStat.mtimeMs, scope);
};

export const resolveFileScope = (agentScope?: string): string => agentScope ?? "main";
