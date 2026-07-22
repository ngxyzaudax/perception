import { useCallback, useEffect, useRef } from "react";
import type { Settings } from "../schemas/settings.js";
import type { ChatMessage } from "../types/messages.js";
import type { PermissionMode } from "../types/permissions.js";
import type { QueryRuntimeExtras } from "../query/queryEngine.js";
import type { PermissionContext } from "../permissions/checkPermission.js";
import { titleSession } from "../services/sessions/titleSession.js";
import { setActiveSessionId } from "../state/backgroundTasks.js";
import { replaceChatMessages } from "./displayState.js";
import { resolveCoordinatorPrompt } from "./slashCommandActions.js";
import type { ReplQueryController } from "./useReplQuery.js";
import type { SessionController } from "./replSession.js";
import type { DisplayMessage } from "../types/displayMessages.js";
import { expandFileMentions } from "../utils/fileMentions.js";
import { getCwd } from "../utils/cwd.js";
import { recordCheckpoint } from "../services/checkpoints/checkpointState.js";
import { createCheckpoint } from "../services/checkpoints/shadowRepo.js";

type QueryFlowArgs = {
  liveSettings: Settings;
  model: string;
  permissionMode: PermissionMode;
  coordinatorMode: boolean;
  permissionContextRef: React.MutableRefObject<PermissionContext>;
  runtimeExtras: QueryRuntimeExtras;
  query: ReplQueryController;
  session: SessionController;
  overlaysRequestPermission: PermissionContext["requestPermission"];
  setDisplayMessages: React.Dispatch<React.SetStateAction<DisplayMessage[]>>;
};

export const useReplQueryFlow = (args: QueryFlowArgs): ((messages: ChatMessage[]) => Promise<void>) => {
  const submitRef = useRef<(messages: ChatMessage[]) => Promise<void>>(async () => {});

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
      args.setDisplayMessages((current) => replaceChatMessages(current, nextMessages));
      const checkpoint = await createCheckpoint(queued.join("\n").slice(0, 40));
      if (checkpoint) {
        recordCheckpoint(checkpoint, finalMessages.length);
      }
      await submitRef.current(nextMessages);
    },
    [args],
  );

  const submitQuery = useCallback(
    async (nextMessages: ChatMessage[]): Promise<void> => {
      setActiveSessionId(args.session.getSessionId());
      args.setDisplayMessages((current) => replaceChatMessages(current, nextMessages));
      const systemPromptOverride = await resolveCoordinatorPrompt(args.coordinatorMode);
      await args.query.runUserQuery(
        nextMessages,
        {
          ...args.liveSettings,
          model: args.model === "loading..." ? args.liveSettings.model : args.model,
        },
        {
          ...args.permissionContextRef.current,
          mode: args.permissionMode,
          requestPermission: args.overlaysRequestPermission,
        },
        args.runtimeExtras,
        (finalMessages) => {
          args.setDisplayMessages((current) => replaceChatMessages(current, finalMessages));
          args.session.persistSession(finalMessages);
          const userTurns = finalMessages.filter((message) => message.role === "user").length;
          if (userTurns >= 2) {
            void titleSession(args.liveSettings, finalMessages).then((title) => {
              if (title) {
                args.session.persistSession(finalMessages, title);
              }
            });
          }
          void drainFollowUp(finalMessages);
        },
        systemPromptOverride,
      );
    },
    [args, drainFollowUp],
  );

  useEffect(() => {
    submitRef.current = submitQuery;
  }, [submitQuery]);

  return submitQuery;
};
