import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import type { ChatMessage } from "../../types/messages.js";
import { getCwd } from "../../utils/cwd.js";
import {
  deriveSessionTitle,
  sessionSchema,
  toSessionMetadata,
  type SessionMetadata,
  type StoredSession,
} from "./sessionSchema.js";
import { sessionDirectory, sessionFilePath } from "./sessionPaths.js";

export const createSession = (cwd: string = getCwd()): StoredSession => {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    title: "Untitled session",
    cwd,
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
};

export const saveSession = async (
  session: StoredSession,
  titleOverride?: string,
): Promise<void> => {
  const directory = sessionDirectory(session.cwd);
  await mkdir(directory, { recursive: true });
  const payload: StoredSession = {
    ...session,
    title: titleOverride ?? deriveSessionTitle(session.messages),
    updatedAt: new Date().toISOString(),
  };
  await writeFile(
    sessionFilePath(payload.id, payload.cwd),
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8",
  );
};

export const loadSession = async (
  sessionId: string,
  cwd: string = getCwd(),
): Promise<StoredSession | null> => {
  try {
    const raw = await readFile(sessionFilePath(sessionId, cwd), "utf8");
    return sessionSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
};

export const listSessions = async (cwd: string = getCwd()): Promise<SessionMetadata[]> => {
  const directory = sessionDirectory(cwd);
  let entries: string[];
  try {
    entries = await readdir(directory);
  } catch {
    return [];
  }

  const sessions = await Promise.all(
    entries
      .filter((entry) => entry.endsWith(".json"))
      .map(async (entry) => {
        const sessionId = entry.replace(/\.json$/, "");
        return loadSession(sessionId, cwd);
      }),
  );

  return sessions
    .filter((session): session is StoredSession => session !== null)
    .map(toSessionMetadata)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
};

export const buildSessionFromMessages = (
  sessionId: string,
  messages: ChatMessage[],
  cwd: string = getCwd(),
  createdAt?: string,
): StoredSession => ({
  id: sessionId,
  title: deriveSessionTitle(messages),
  cwd,
  createdAt: createdAt ?? new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  messages,
});

export const autosaveSession = (
  sessionId: string,
  messages: ChatMessage[],
  createdAt: string,
  cwd: string = getCwd(),
  titleOverride?: string,
): void => {
  void saveSession(buildSessionFromMessages(sessionId, messages, cwd, createdAt), titleOverride).catch(
    () => undefined,
  );
};
