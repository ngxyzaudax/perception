import { useCallback, useEffect, useRef, useState } from "react";
import { runQuery } from "../query/queryEngine.js";
import type { QueryRuntimeExtras } from "../query/queryEngine.js";
import type { Settings } from "../schemas/settings.js";
import type { PermissionContext } from "../permissions/checkPermission.js";
import type { ChatMessage } from "../types/messages.js";
import { runHookEvent } from "../services/hooks/runHooks.js";
import { getCwd } from "../utils/cwd.js";
import { createQueryEventHandler, createQueryStatusSetter } from "./queryEventHandler.js";
import { useStreamingDisplay } from "./useStreamingDisplay.js";

export type ReplQueryController = {
  busy: boolean;
  preparing: boolean;
  isActive: boolean;
  streamingText: string;
  thinkingText: string;
  status: string;
  queuedInputs: string[];
  queryStartedAt: number | null;
  setStatus: (status: string) => void;
  setPreparing: (preparing: boolean) => void;
  clearStream: () => void;
  abortQuery: () => void;
  queueInput: (input: string) => void;
  drainQueue: () => string[];
  runUserQuery: (
    nextMessages: ChatMessage[],
    settings: Settings,
    permissionContext: PermissionContext,
    runtimeExtras: QueryRuntimeExtras,
    onComplete: (messages: ChatMessage[]) => void,
    onMessageComplete?: (message: ChatMessage) => void,
    systemPromptOverride?: string,
  ) => Promise<void>;
};

export const useReplQuery = (registry: Parameters<typeof runQuery>[0]["registry"]): ReplQueryController => {
  const streaming = useStreamingDisplay();
  const [busy, setBusy] = useState(false);
  const [preparing, setPreparingState] = useState(false);
  const [status, setStatusState] = useState("");
  const [queryStartedAt, setQueryStartedAt] = useState<number | null>(null);
  const [queuedInputs, setQueuedInputs] = useState<string[]>([]);
  const queueRef = useRef<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const busyRef = useRef(false);
  const rateStatusRef = useRef(createQueryStatusSetter(setStatusState));

  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  const clearStream = useCallback((): void => {
    streaming.clear();
  }, [streaming.clear]);

  const setPreparing = useCallback((value: boolean): void => {
    setPreparingState(value);
    if (value) {
      setQueryStartedAt(Date.now());
      return;
    }
    if (!busyRef.current) {
      setQueryStartedAt(null);
    }
  }, []);

  const abortQuery = useCallback((): void => {
    abortRef.current?.abort();
  }, []);

  const queueInput = useCallback((input: string): void => {
    queueRef.current = [...queueRef.current, input];
    setQueuedInputs([...queueRef.current]);
  }, []);

  const drainQueue = useCallback((): string[] => {
    const drained = [...queueRef.current];
    queueRef.current = [];
    setQueuedInputs([]);
    return drained;
  }, []);

  const runUserQuery = useCallback(
    async (
      nextMessages: ChatMessage[],
      settings: Settings,
      permissionContext: PermissionContext,
      runtimeExtras: QueryRuntimeExtras,
      onComplete: (messages: ChatMessage[]) => void,
      onMessageComplete?: (message: ChatMessage) => void,
      systemPromptOverride?: string,
    ): Promise<void> => {
      const controller = new AbortController();
      abortRef.current = controller;
      setPreparingState(false);
      streaming.clear();
      rateStatusRef.current("");
      setQueryStartedAt(Date.now());
      setBusy(true);
      const hooksConfig = runtimeExtras.hooksConfig ?? settings.hooks ?? {};
      const onEvent = createQueryEventHandler({
        appendText: streaming.appendText,
        appendThinking: streaming.appendThinking,
        pushStatus: rateStatusRef.current,
        setStatusImmediate: setStatusState,
        onMessageComplete,
      });
      try {
        const result = await runQuery({
          settings,
          registry,
          messages: nextMessages,
          permissionContext,
          signal: controller.signal,
          runtimeExtras,
          systemPromptOverride,
          onEvent,
        });
        onComplete(result.messages);
        clearStream();
        await runHookEvent(hooksConfig, { event: "Stop", cwd: getCwd() });
      } catch (error) {
        clearStream();
        setStatusState(controller.signal.aborted ? "query aborted" : error instanceof Error ? error.message : "query failed");
        await runHookEvent(hooksConfig, { event: "Stop", cwd: getCwd() });
      } finally {
        abortRef.current = null;
        setBusy(false);
        setQueryStartedAt(null);
      }
    },
    [clearStream, registry, streaming.appendText, streaming.appendThinking],
  );

  return {
    busy,
    preparing,
    isActive: busy || preparing,
    streamingText: streaming.streamingText,
    thinkingText: streaming.thinkingText,
    status,
    queuedInputs,
    queryStartedAt,
    setStatus: setStatusState,
    setPreparing,
    clearStream,
    abortQuery,
    queueInput,
    drainQueue,
    runUserQuery,
  };
};
