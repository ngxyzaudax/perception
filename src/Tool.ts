import type { z } from "zod";
import type { Settings } from "./schemas/settings.js";
import type { PermissionResult } from "./types/permissions.js";
import type { QueryEvent } from "./types/messages.js";
import type { PermissionContext } from "./permissions/checkPermission.js";
import type { HooksConfig } from "./services/hooks/hookSchema.js";
import type { PermissionMode } from "./types/permissions.js";
import type { QuestionOption } from "./types/questions.js";
import type { DiffPreview } from "./utils/diffLines.js";

export type ToolRuntime = {
  settings: Settings;
  registry: ToolRegistry;
  permissionContext: PermissionContext;
  onEvent: (event: QueryEvent) => void;
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
  isConcurrencySafe?: (input: z.infer<TInput>) => boolean;
  needsExplicitPermission?: (input: z.infer<TInput>) => boolean;
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

type ToolDefinitionInput<TInput extends z.ZodTypeAny> = Omit<
  ToolDefinition<TInput>,
  "isReadOnly" | "isConcurrencySafe"
> & {
  isReadOnly?: (input: z.infer<TInput>) => boolean;
  isConcurrencySafe?: (input: z.infer<TInput>) => boolean;
};

export const buildTool = <TInput extends z.ZodTypeAny>(
  definition: ToolDefinitionInput<TInput>,
): ToolDefinition<TInput> => {
  const isReadOnly = definition.isReadOnly ?? (() => false);
  return {
    ...definition,
    isReadOnly,
    isConcurrencySafe: definition.isConcurrencySafe ?? isReadOnly,
  };
};

export const getTool = (
  registry: ToolRegistry,
  name: string,
): AnyToolDefinition | undefined => registry[name];

export const filterToolRegistry = (
  registry: ToolRegistry,
  allowedTools: string[],
): ToolRegistry => {
  if (allowedTools.length === 0) {
    return registry;
  }
  return Object.fromEntries(
    Object.entries(registry).filter(([name]) => allowedTools.includes(name)),
  );
};

export const listTools = (registry: ToolRegistry): AnyToolDefinition[] =>
  Object.values(registry);
