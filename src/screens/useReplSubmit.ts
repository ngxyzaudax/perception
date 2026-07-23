import { useCallback } from "react";
import type { Settings } from "../schemas/settings.js";
import type { SkillDefinition } from "../skills/skillSchema.js";
import type { HooksConfig } from "../services/hooks/hookSchema.js";
import type { ChatMessage } from "../types/messages.js";
import type { PermissionMode } from "../types/permissions.js";
import type { DisplayMessage } from "../types/displayMessages.js";
import { executeSlashAction } from "./slashCommandActions.js";
import type { SessionController } from "./replSession.js";
import type { OverlayController } from "./useOverlays.js";
import type { ReplQueryController } from "./useReplQuery.js";
import { createPermissionContext } from "../permissions/checkPermission.js";
import { applySlashResult } from "./applySlashResult.js";
import { appendChatMessage } from "./displayState.js";

export type SubmitDeps = {
  liveSettings: Settings;
  permissionMode: PermissionMode;
  coordinatorMode: boolean;
  messages: ChatMessage[];
  skills: SkillDefinition[];
  hooksConfig: HooksConfig;
  session: SessionController;
  maxContextTokens: number;
  overlays: OverlayController;
  query: ReplQueryController;
  permissionContextRef: React.MutableRefObject<ReturnType<typeof createPermissionContext>>;
  setLiveSettings: (settings: Settings) => void;
  setCoordinatorMode: React.Dispatch<React.SetStateAction<boolean>>;
  setModel: (model: string) => void;
  setMaxContextTokens: (tokens: number) => void;
  setDisplayMessages: React.Dispatch<React.SetStateAction<DisplayMessage[]>>;
  updatePermissionMode: (mode: PermissionMode) => void;
  submitQuery: (messages: ChatMessage[]) => Promise<void>;
  onExit: () => void;
};

export const useReplSubmit = (deps: SubmitDeps) =>
  useCallback(
    async (input: string): Promise<void> => {
      const trimmed = input.trim();
      if (trimmed.length === 0) {
        return;
      }
      if (deps.query.isActive) {
        deps.query.queueInput(trimmed);
        return;
      }
      if (!trimmed.startsWith("/")) {
        deps.setDisplayMessages((current) =>
          appendChatMessage(current, { role: "user", content: trimmed }),
        );
      }
      deps.query.setPreparing(true);
      try {
        const result = await executeSlashAction({
          input: trimmed,
          settings: deps.liveSettings,
          permissionContext: deps.permissionContextRef.current,
          permissionMode: deps.permissionMode,
          coordinatorMode: deps.coordinatorMode,
          messages: deps.messages,
          skills: deps.skills,
          hooksConfig: deps.hooksConfig,
          session: deps.session,
          maxContextTokens: deps.maxContextTokens,
          onPermissionContextUpdate: (context) => {
            deps.permissionContextRef.current = context;
          },
          onCoordinatorToggle: () => {
            deps.setCoordinatorMode((current) => !current);
          },
          onModelResolved: (modelId, tokens) => {
            deps.setModel(modelId);
            deps.setMaxContextTokens(tokens);
          },
        });
        await applySlashResult(result, deps);
      } finally {
        deps.query.setPreparing(false);
      }
    },
    [deps],
  );
