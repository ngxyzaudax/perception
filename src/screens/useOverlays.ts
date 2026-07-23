import { useCallback, useRef, useState } from "react";
import type { SessionMetadata } from "../services/sessions/sessionSchema.js";
import type { TrackedCheckpoint } from "../services/checkpoints/checkpointState.js";
import {
  createPermissionResolver,
  createQuestionResolver,
  resolvePermissionHead,
  settleQuestionAnswer,
  settleQuestionCancel,
  type PendingPermission,
  type PendingQuestion,
} from "./permissionResolver.js";

export type OverlayState = {
  permissionQueue: PendingPermission[];
  pendingQuestion: PendingQuestion | null;
  resumeSessions: SessionMetadata[] | null;
  rewindCheckpoints: TrackedCheckpoint[] | null;
};

export type OverlayController = OverlayState & {
  requestPermission: ReturnType<typeof createPermissionResolver>;
  requestQuestion: ReturnType<typeof createQuestionResolver>;
  resolvePermission: (result: Parameters<typeof resolvePermissionHead>[1]) => void;
  setResumeSessions: (sessions: SessionMetadata[] | null) => void;
  setRewindCheckpoints: (checkpoints: TrackedCheckpoint[] | null) => void;
  resolveQuestion: (answer: string) => void;
  cancelQuestion: () => void;
  isPickerOpen: boolean;
};

export const useOverlays = (): OverlayController => {
  const [permissionQueue, setPermissionQueue] = useState<PendingPermission[]>([]);
  const [pendingQuestion, setPendingQuestion] = useState<PendingQuestion | null>(null);
  const [resumeSessions, setResumeSessions] = useState<SessionMetadata[] | null>(null);
  const [rewindCheckpoints, setRewindCheckpoints] = useState<TrackedCheckpoint[] | null>(null);
  const pendingQuestionRef = useRef<PendingQuestion | null>(null);
  pendingQuestionRef.current = pendingQuestion;

  const requestPermission = useCallback(createPermissionResolver(setPermissionQueue), []);
  const requestQuestion = useCallback(createQuestionResolver(setPendingQuestion), []);

  const resolvePermission = useCallback((result: Parameters<typeof resolvePermissionHead>[1]) => {
    resolvePermissionHead(setPermissionQueue, result);
  }, []);

  const resolveQuestion = useCallback((answer: string): void => {
    const pending = pendingQuestionRef.current;
    setPendingQuestion(null);
    settleQuestionAnswer(pending, answer);
  }, []);

  const cancelQuestion = useCallback((): void => {
    const pending = pendingQuestionRef.current;
    setPendingQuestion(null);
    settleQuestionCancel(pending);
  }, []);

  const isPickerOpen =
    permissionQueue.length > 0 ||
    pendingQuestion !== null ||
    resumeSessions !== null ||
    rewindCheckpoints !== null;

  return {
    permissionQueue,
    pendingQuestion,
    resumeSessions,
    rewindCheckpoints,
    requestPermission,
    requestQuestion,
    resolvePermission,
    setResumeSessions,
    setRewindCheckpoints,
    resolveQuestion,
    cancelQuestion,
    isPickerOpen,
  };
};
