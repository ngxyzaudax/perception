import { createPermissionContext } from "../permissions/checkPermission.js";
import type { Settings } from "../schemas/settings.js";
import type { SkillDefinition } from "../skills/skillSchema.js";
import type { HooksConfig } from "../services/hooks/hookSchema.js";
import type { ChatMessage } from "../types/messages.js";
import type { PermissionMode } from "../types/permissions.js";
import type { SessionController } from "./replSession.js";

export type SlashActionResult =
  | { type: "exit" }
  | { type: "clear" }
  | { type: "status"; content: string; title?: string }
  | { type: "resume" }
  | { type: "rewind" }
  | { type: "branch"; sessionId: string }
  | { type: "toggle_coordinator" }
  | { type: "update_settings"; settings: Settings }
  | { type: "update_permission_mode"; mode: PermissionMode }
  | { type: "approve_plan" }
  | { type: "set_messages"; messages: ChatMessage[] }
  | { type: "query"; messages: ChatMessage[] }
  | { type: "skill"; prompt: string; messages: ChatMessage[] }
  | { type: "noop" };

export type SlashActionContext = {
  input: string;
  settings: Settings;
  permissionContext: ReturnType<typeof createPermissionContext>;
  permissionMode: PermissionMode;
  coordinatorMode: boolean;
  messages: ChatMessage[];
  skills: SkillDefinition[];
  hooksConfig: HooksConfig;
  session: SessionController;
  maxContextTokens: number;
  onPermissionContextUpdate: (context: ReturnType<typeof createPermissionContext>) => void;
  onCoordinatorToggle: () => void;
  onModelResolved: (modelId: string, maxContextTokens: number) => void;
};
