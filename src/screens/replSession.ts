import { useCallback, useMemo, useRef } from "react";
import {
  autosaveSession,
  createSession,
  listSessions,
  loadSession,
} from "../services/sessions/sessionStore.js";
import type { SessionMetadata } from "../services/sessions/sessionSchema.js";
import type { ChatMessage } from "../types/messages.js";
import { getCwd } from "../utils/cwd.js";

export type SessionState = {
  id: string;
  createdAt: string;
};

export type SessionController = {
  getSessionId: () => string;
  persistSession: (messages: ChatMessage[], titleOverride?: string) => void;
  startFreshSession: () => void;
  branchSession: (messages: ChatMessage[]) => string;
  openResumePicker: () => Promise<SessionMetadata[] | null>;
  resumeSession: (sessionId: string) => Promise<{
    messages: ChatMessage[];
    title: string;
  } | null>;
};

export const useSessionController = (): SessionController => {
  const sessionRef = useRef<SessionState>(toSessionState(createSession()));

  const getSessionId = useCallback((): string => sessionRef.current.id, []);

  const persistSession = useCallback((messages: ChatMessage[], titleOverride?: string): void => {
    autosaveSession(
      sessionRef.current.id,
      messages,
      sessionRef.current.createdAt,
      getCwd(),
      titleOverride,
    );
  }, []);

  const startFreshSession = useCallback((): void => {
    sessionRef.current = toSessionState(createSession());
  }, []);

  const branchSession = useCallback((messages: ChatMessage[]): string => {
    const next = toSessionState(createSession());
    sessionRef.current = next;
    autosaveSession(next.id, messages, next.createdAt, getCwd());
    return next.id;
  }, []);

  const openResumePicker = useCallback(async (): Promise<SessionMetadata[] | null> => {
    const sessions = await listSessions(getCwd());
    return sessions.length > 0 ? sessions : null;
  }, []);

  const resumeSession = useCallback(
    async (sessionId: string): Promise<{ messages: ChatMessage[]; title: string } | null> => {
      const session = await loadSession(sessionId, getCwd());
      if (!session) {
        return null;
      }
      sessionRef.current = { id: session.id, createdAt: session.createdAt };
      return { messages: session.messages, title: session.title };
    },
    [],
  );

  return useMemo(
    () => ({
      getSessionId,
      persistSession,
      startFreshSession,
      branchSession,
      openResumePicker,
      resumeSession,
    }),
    [branchSession, getSessionId, openResumePicker, persistSession, resumeSession, startFreshSession],
  );
};

const toSessionState = (session: ReturnType<typeof createSession>): SessionState => ({
  id: session.id,
  createdAt: session.createdAt,
});
