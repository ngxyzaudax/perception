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
  const stdout = result.stdout.trim();
  const jsonResult = parseHookStdout(stdout);
  if (jsonResult) {
    return jsonResult;
  }
  if (stdout.length > 0 && (input.event === "UserPromptSubmit" || input.event === "SessionStart")) {
    return { allowed: true, context: stdout };
  }
  return { allowed: true };
};

export const parseHookStdout = (stdout: string): HookResult | null => {
  if (!stdout.startsWith("{")) {
    return null;
  }
  try {
    const parsed = JSON.parse(stdout) as {
      decision?: string;
      reason?: string;
      additionalContext?: string;
    };
    if (parsed.decision === "block") {
      return { allowed: false, reason: parsed.reason ?? "hook blocked action" };
    }
    if (typeof parsed.additionalContext === "string" && parsed.additionalContext.length > 0) {
      return { allowed: true, context: parsed.additionalContext };
    }
    return { allowed: true };
  } catch {
    return null;
  }
};
