import { useCallback, useEffect, useRef } from "react";
import type { Settings } from "../schemas/settings.js";
import type { ChatMessage } from "../types/messages.js";
import type { QueryRuntimeExtras } from "../query/queryEngine.js";
import type { PermissionContext } from "../permissions/checkPermission.js";
import { titleSession } from "../services/sessions/titleSession.js";
import { extractProjectMemory } from "../services/memory/extractProjectMemory.js";
import { setActiveSessionId } from "../state/backgroundTasks.js";
import { appendChatMessage, appendStatus, reconcileChatMessages } from "./displayState.js";
import { resolveCoordinatorPrompt } from "./slashCommandActions.js";
import type { ReplQueryController } from "./useReplQuery.js";
import type { QueryOverrides } from "./replQueryTypes.js";
import type { SessionController } from "./replSession.js";
import type { DisplayMessage } from "../types/displayMessages.js";
import { expandFileMentions } from "../utils/fileMentions.js";
import { getCwd } from "../utils/cwd.js";
import { recordCheckpoint } from "../services/checkpoints/checkpointState.js";
import { createCheckpoint } from "../services/checkpoints/shadowRepo.js";

type QueryFlowArgs = {
  liveSettings: Settings;
  model: string;
  coordinatorMode: boolean;
  permissionContextRef: React.MutableRefObject<PermissionContext>;
  runtimeExtras: QueryRuntimeExtras;
  query: ReplQueryController;
  session: SessionController;
  overlaysRequestPermission: PermissionContext["requestPermission"];
  setDisplayMessages: React.Dispatch<React.SetStateAction<DisplayMessage[]>>;
  onFinalMessages?: (messages: ChatMessage[]) => void;
};

const scheduleCheckpoint = (label: string, messageCount: number): void => {
  void createCheckpoint(label)
    .then((checkpoint) => {
      if (checkpoint) {
        recordCheckpoint(checkpoint, messageCount);
      }
    })
    .catch(() => {});
};

export const useReplQueryFlow = (
  args: QueryFlowArgs,
): ((messages: ChatMessage[], overrides?: QueryOverrides) => Promise<void>) => {
  const submitRef = useRef<(messages: ChatMessage[]) => Promise<void>>(async () => {});

  const handleMessageComplete = useCallback(
    (message: ChatMessage): void => {
      args.setDisplayMessages((current) => appendChatMessage(current, message));
      if (message.role === "assistant") {
        args.query.clearStream();
      }
    },
    [args],
  );

  const drainFollowUp = useCallback(
    async (finalMessages: ChatMessage[]): Promise<void> => {
      const queued = args.query.drainQueue();
      if (queued.length === 0) {
        return;
      }
      const expanded = await expandFileMentions(queued.join("\n"), getCwd());
      const content =
        expanded.attachments.length > 0
          ? `${expanded.prompt}\n\n${expanded.attachments.join("\n\n")}`
          : expanded.prompt;
      const nextMessages: ChatMessage[] = [...finalMessages, { role: "user", content }];
      args.setDisplayMessages((current) => appendChatMessage(current, { role: "user", content }));
      scheduleCheckpoint(queued.join("\n").slice(0, 40), finalMessages.length);
      await submitRef.current(nextMessages);
    },
    [args],
  );

  const submitQuery = useCallback(
    async (nextMessages: ChatMessage[], overrides?: QueryOverrides): Promise<void> => {
      setActiveSessionId(args.session.getSessionId());
      const systemPromptOverride = await resolveCoordinatorPrompt(args.coordinatorMode);
      const permissionContext = args.permissionContextRef.current;
      permissionContext.requestPermission = args.overlaysRequestPermission;
      await args.query.runUserQuery(
        nextMessages,
        {
          ...args.liveSettings,
          model: args.model === "loading..." ? args.liveSettings.model : args.model,
        },
        permissionContext,
        args.runtimeExtras,
        (finalMessages) => {
          args.onFinalMessages?.(finalMessages);
          args.setDisplayMessages((current) => reconcileChatMessages(current, finalMessages));
          args.session.persistSession(finalMessages);
          void extractProjectMemory(args.liveSettings, finalMessages).catch(() => undefined);
          const userTurns = finalMessages.filter((message) => message.role === "user").length;
          if (userTurns >= 2) {
            void titleSession(args.liveSettings, finalMessages)
              .then((title) => {
                if (title) {
                  args.session.persistSession(finalMessages, title);
                }
              })
              .catch(() => {});
          }
          void drainFollowUp(finalMessages).catch((error: unknown) => {
            args.query.setStatus(
              error instanceof Error ? error.message : "queued input failed",
            );
          });
        },
        handleMessageComplete,
        (message) => {
          args.setDisplayMessages((current) => appendStatus(current, message, "Error"));
        },
        systemPromptOverride,
        overrides,
      );
    },
    [args, drainFollowUp, handleMessageComplete],
  );

  useEffect(() => {
    submitRef.current = submitQuery;
  }, [submitQuery]);

  return submitQuery;
};
