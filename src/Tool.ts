import type { z } from "zod";
import type { Settings } from "./schemas/settings.js";
import type { PermissionResult } from "./types/permissions.js";
import type { QueryEvent } from "./types/messages.js";
import type { PermissionContext } from "./permissions/checkPermission.js";
import type { HooksConfig } from "./services/hooks/hookSchema.js";
import type { PermissionMode } from "./types/permissions.js";
import type { DiffPreview } from "./utils/diffLines.js";

export type ToolRuntime = {
  settings: Settings;
  registry: ToolRegistry;
  permissionContext: PermissionContext;
  onEvent: (event: QueryEvent) => void;
  sessionId?: string;
  hooksConfig?: HooksConfig;
  updatePermissionMode?: (mode: PermissionMode) => void;
  requestQuestion?: (question: string, options: string[]) => Promise<string>;
  coordinatorMode?: boolean;
  cwd?: string;
  agentScope?: string;
};

export type ToolUseContext = {
  cwd: string;
  abortSignal: AbortSignal;
  runtime?: ToolRuntime;
};

export type ToolDefinition<TInput extends z.ZodTypeAny> = {
  name: string;
  description: string;
  inputSchema: TInput;
  isReadOnly: (input: z.infer<TInput>) => boolean;
  summarize: (input: z.infer<TInput>) => string;
  call: (input: z.infer<TInput>, context: ToolUseContext) => Promise<string>;
  getPreview?: (
    input: z.infer<TInput>,
    context: ToolUseContext,
  ) => Promise<DiffPreview | undefined>;
  checkPermissions?: (
    input: z.infer<TInput>,
    context: ToolUseContext,
  ) => Promise<PermissionResult | null>;
};

export type AnyToolDefinition = ToolDefinition<z.ZodTypeAny>;

export type ToolRegistry = Record<string, AnyToolDefinition>;

export const buildTool = <TInput extends z.ZodTypeAny>(
  definition: ToolDefinition<TInput>,
): ToolDefinition<TInput> => definition;

export const getTool = (
  registry: ToolRegistry,
  name: string,
): AnyToolDefinition | undefined => registry[name];

export const listTools = (registry: ToolRegistry): AnyToolDefinition[] =>
  Object.values(registry);
