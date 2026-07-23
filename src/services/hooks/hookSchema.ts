import { z } from "zod";

export const hookEventSchema = z.enum([
  "PreToolUse",
  "PostToolUse",
  "UserPromptSubmit",
  "Stop",
  "SessionStart",
  "PreCompact",
  "PostCompact",
  "SubagentStop",
  "Notification",
]);

export const hookCommandSchema = z.object({
  type: z.literal("command"),
  command: z.string(),
});

export const hookMatcherSchema = z.object({
  matcher: z.string().optional(),
  hooks: z.array(hookCommandSchema),
});

export const hooksConfigSchema = z.record(z.string(), z.array(hookMatcherSchema));

export type HookEvent = z.infer<typeof hookEventSchema>;
export type HookCommand = z.infer<typeof hookCommandSchema>;
export type HookMatcher = z.infer<typeof hookMatcherSchema>;
export type HooksConfig = Partial<Record<HookEvent, HookMatcher[]>>;

export type HookInput = {
  event: HookEvent;
  toolName?: string;
  summary?: string;
  input?: unknown;
  output?: string;
  prompt?: string;
  message?: string;
  cwd: string;
};

export type HookResult =
  | { allowed: true; context?: string }
  | { allowed: false; reason: string };
