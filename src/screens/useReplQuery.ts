import { useCallback, useEffect, useRef, useState } from "react";
import { runQuery } from "../query/queryEngine.js";
import type { QueryRuntimeExtras } from "../query/queryEngine.js";
import type { Settings } from "../schemas/settings.js";
import type { PermissionContext } from "../permissions/checkPermission.js";
import type { ChatMessage } from "../types/messages.js";
import { createQueryEventHandler, createQueryStatusSetter } from "./queryEventHandler.js";
import { useStreamingDisplay } from "./useStreamingDisplay.js";
import { clearRunningTools } from "../state/runningTools.js";
import type { SpinnerMode } from "./spinnerMode.js";
import { filterToolRegistry } from "../Tool.js";
import type { QueryOverrides, ReplQueryController } from "./replQueryTypes.js";

export type { ReplQueryController } from "./replQueryTypes.js";

export const useReplQuery = (registry: Parameters<typeof runQuery>[0]["registry"]): ReplQueryController => {
  const streaming = useStreamingDisplay();
  const [busy, setBusy] = useState(false);
  const [preparing, setPreparingState] = useState(false);
  const [status, setStatusState] = useState("");
  const [queryStartedAt, setQueryStartedAt] = useState<number | null>(null);
  const [spinnerMode, setSpinnerMode] = useState<SpinnerMode>("thinking");
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
    abortRef.current?.abort("user-cancel");
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
      onErrorNotice?: (message: string) => void,
      systemPromptOverride?: string,
      overrides?: QueryOverrides,
    ): Promise<void> => {
      const controller = new AbortController();
      abortRef.current = controller;
      setPreparingState(false);
      streaming.clear();
      rateStatusRef.current("");
      setQueryStartedAt(Date.now());
      setBusy(true);
      setSpinnerMode("thinking");
      const onEvent = createQueryEventHandler({
        appendText: streaming.appendText,
        appendThinking: streaming.appendThinking,
        pushStatus: rateStatusRef.current,
        setStatusImmediate: setStatusState,
        onMessageComplete,
        onToolPreview: (name, argsPreview) =>
          streaming.setToolPreview(`${name} ${argsPreview}`.trim()),
        onSpinnerMode: setSpinnerMode,
      });
      try {
        const result = await runQuery({
          settings: overrides?.model ? { ...settings, model: overrides.model } : settings,
          registry: filterToolRegistry(registry, overrides?.allowedTools ?? []),
          messages: nextMessages,
          permissionContext,
          signal: controller.signal,
          runtimeExtras,
          systemPromptOverride,
          onEvent,
        });
        onComplete(result.messages);
        clearStream();
      } catch (error) {
        clearStream();
        const message = controller.signal.aborted
          ? "query aborted"
          : error instanceof Error
            ? error.message
            : "query failed";
        setStatusState(message);
        if (!controller.signal.aborted) {
          onErrorNotice?.(message);
        }
      } finally {
        abortRef.current = null;
        setBusy(false);
        setQueryStartedAt(null);
        clearRunningTools();
      }
    },
    [clearStream, registry, streaming.appendText, streaming.appendThinking, streaming.setToolPreview],
  );

  return {
    busy,
    preparing,
    isActive: busy || preparing,
    streamingText: streaming.streamingText,
    thinkingText: streaming.thinkingText,
    toolPreview: streaming.toolPreview,
    spinnerMode,
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
