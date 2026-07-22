import { useCallback, useRef, useState } from "react";
import { runQuery } from "../query/queryEngine.js";
import type { QueryRuntimeExtras } from "../query/queryEngine.js";
import type { Settings } from "../schemas/settings.js";
import type { PermissionContext } from "../permissions/checkPermission.js";
import type { ChatMessage } from "../types/messages.js";
import { runHookEvent } from "../services/hooks/runHooks.js";
import { getCwd } from "../utils/cwd.js";
import { useStreamingDisplay } from "./useStreamingDisplay.js";

export type ReplQueryController = {
  busy: boolean;
  streamingText: string;
  thinkingText: string;
  status: string;
  queuedInputs: string[];
  queryStartedAt: number | null;
  setStatus: (status: string) => void;
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
    systemPromptOverride?: string,
  ) => Promise<void>;
};

export const useReplQuery = (registry: Parameters<typeof runQuery>[0]["registry"]): ReplQueryController => {
  const streaming = useStreamingDisplay();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [queryStartedAt, setQueryStartedAt] = useState<number | null>(null);
  const [queuedInputs, setQueuedInputs] = useState<string[]>([]);
  const queueRef = useRef<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const clearStream = useCallback((): void => {
    streaming.clear();
  }, [streaming.clear]);

  const appendText = streaming.appendText;
  const appendThinking = streaming.appendThinking;

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
      systemPromptOverride?: string,
    ): Promise<void> => {
      const controller = new AbortController();
      abortRef.current = controller;
      streaming.clear();
      setStatus("");
      setQueryStartedAt(Date.now());
      setBusy(true);
      const hooksConfig = runtimeExtras.hooksConfig ?? settings.hooks ?? {};
      try {
        const result = await runQuery({
          settings,
          registry,
          messages: nextMessages,
          permissionContext,
          signal: controller.signal,
          runtimeExtras,
          systemPromptOverride,
          onEvent: (event) => {
            if (event.type === "text_delta") {
              appendText(event.text);
            }
            if (event.type === "reasoning_delta") {
              appendThinking(event.text);
            }
            if (event.type === "tool_start") {
              setStatus(`running ${event.name}`);
            }
            if (event.type === "tool_end") {
              setStatus(
                event.isError ? `tool error: ${event.name}` : `finished ${event.name}`,
              );
            }
            if (event.type === "usage") {
              setStatus(`${event.tokensPerSecond.toFixed(1)} tok/s`);
            }
            if (event.type === "error") {
              setStatus(event.message);
            }
          },
        });
        onComplete(result.messages);
        clearStream();
        await runHookEvent(hooksConfig, { event: "Stop", cwd: getCwd() });
      } catch (error) {
        clearStream();
        if (controller.signal.aborted) {
          setStatus("query aborted");
        } else {
          setStatus(error instanceof Error ? error.message : "query failed");
        }
        await runHookEvent(hooksConfig, { event: "Stop", cwd: getCwd() });
      } finally {
        abortRef.current = null;
        setBusy(false);
        setQueryStartedAt(null);
      }
    },
    [appendText, appendThinking, clearStream, registry],
  );

  return {
    busy,
    streamingText: streaming.streamingText,
    thinkingText: streaming.thinkingText,
    status,
    queuedInputs,
    queryStartedAt,
    setStatus,
    clearStream,
    abortQuery,
    queueInput,
    drainQueue,
    runUserQuery,
  };
};
