import { execa } from "execa";
import { anyRuleMatches } from "../../permissions/rules.js";
import type { HookInput, HookResult, HooksConfig } from "./hookSchema.js";

export const runHookEvent = async (
  config: HooksConfig,
  input: HookInput,
): Promise<HookResult> => {
  const matchers = config[input.event] ?? [];
  for (const matcher of matchers) {
    if (matcher.matcher && input.toolName) {
      const summary = input.summary ?? "";
      if (!anyRuleMatches([matcher.matcher], input.toolName, summary)) {
        continue;
      }
    }
    for (const hook of matcher.hooks) {
      const result = await runCommandHook(hook.command, input);
      if (!result.allowed) {
        return result;
      }
      if (result.context) {
        return result;
      }
    }
  }
  return { allowed: true };
};

const runCommandHook = async (command: string, input: HookInput): Promise<HookResult> => {
  const result = await execa("bash", ["-lc", command], {
    input: JSON.stringify(input),
    reject: false,
    env: process.env,
  });
  if (result.exitCode === 2) {
    return { allowed: false, reason: result.stderr.trim() || "hook denied action" };
  }
  if (result.exitCode !== 0) {
    return { allowed: false, reason: result.stderr.trim() || `hook failed with exit ${result.exitCode}` };
  }
  const context = result.stdout.trim();
  if (context.length > 0 && (input.event === "UserPromptSubmit" || input.event === "SessionStart")) {
    return { allowed: true, context };
  }
  return { allowed: true };
};
