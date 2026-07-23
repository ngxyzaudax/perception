import { useCallback, useMemo, useRef, useState } from "react";
import {
  createPermissionContext,
  setPermissionMode,
} from "../permissions/checkPermission.js";
import type { Settings } from "../schemas/settings.js";
import type { HooksConfig } from "../services/hooks/hookSchema.js";
import type { SkillDefinition } from "../skills/skillSchema.js";
import { createToolRegistry } from "../tools.js";
import type { ToolRegistry } from "../Tool.js";
import type { DisplayMessage } from "../types/displayMessages.js";
import type { PermissionMode } from "../types/permissions.js";
import { extractChatMessages } from "./displayState.js";
import { useSessionController } from "./replSession.js";

export const useReplState = (initialSettings: Settings) => {
  const [liveSettings, setLiveSettings] = useState(initialSettings);
  const [hooksConfig, setHooksConfig] = useState<HooksConfig>({});
  const [registry, setRegistry] = useState<ToolRegistry>(() => createToolRegistry());
  const [skills, setSkills] = useState<SkillDefinition[]>([]);
  const [displayMessages, setDisplayMessages] = useState<DisplayMessage[]>([]);
  const [model, setModel] = useState(initialSettings.model ?? "loading...");
  const [maxContextTokens, setMaxContextTokens] = useState(128000);
  const [permissionMode, setMode] = useState<PermissionMode>(initialSettings.permissionMode);
  const [coordinatorMode, setCoordinatorMode] = useState(false);
  const session = useSessionController();
  const permissionContextRef = useRef(
    createPermissionContext({
      mode: initialSettings.permissionMode,
      alwaysAllowRules: initialSettings.alwaysAllowRules,
      denyRules: initialSettings.denyRules,
      askRules: initialSettings.askRules,
      allowedDomains: initialSettings.allowedDomains,
      additionalDirectories: initialSettings.additionalDirectories,
    }),
  );
  const messages = useMemo(() => extractChatMessages(displayMessages), [displayMessages]);
  const updatePermissionMode = useCallback((mode: PermissionMode): void => {
    permissionContextRef.current = setPermissionMode(permissionContextRef.current, mode);
    setMode(mode);
  }, []);
  return {
    liveSettings,
    setLiveSettings,
    hooksConfig,
    setHooksConfig,
    registry,
    setRegistry,
    skills,
    setSkills,
    displayMessages,
    setDisplayMessages,
    model,
    setModel,
    maxContextTokens,
    setMaxContextTokens,
    permissionMode,
    coordinatorMode,
    setCoordinatorMode,
    session,
    permissionContextRef,
    messages,
    updatePermissionMode,
  };
};
