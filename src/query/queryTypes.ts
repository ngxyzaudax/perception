import type { Settings } from "../schemas/settings.js";
import type { ToolRegistry } from "../Tool.js";
import type { PermissionContext } from "../permissions/checkPermission.js";
import type { ChatMessage, QueryEvent } from "../types/messages.js";
import type { HooksConfig } from "../services/hooks/hookSchema.js";
import type { PermissionMode } from "../types/permissions.js";
import type { QuestionOption } from "../types/questions.js";

export type QueryRuntimeExtras = {
  sessionId?: string;
  hooksConfig?: HooksConfig;
  updatePermissionMode?: (mode: PermissionMode) => void;
  requestQuestion?: (
    question: string,
    options: readonly QuestionOption[],
    signal?: AbortSignal,
  ) => Promise<string>;
  coordinatorMode?: boolean;
  cwd?: string;
  agentScope?: string;
};

export type QueryInput = {
  settings: Settings;
  registry: ToolRegistry;
  messages: ChatMessage[];
  permissionContext: PermissionContext;
  signal?: AbortSignal;
  systemPromptOverride?: string;
  runtimeExtras?: QueryRuntimeExtras;
  maxTurns?: number;
  onEvent: (event: QueryEvent) => void;
};

export type QueryResult = { messages: ChatMessage[] };
