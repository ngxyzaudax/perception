import type { PermissionMode, PermissionResult } from "../types/permissions.js";
import type { PermissionRequest } from "../types/permissions.js";
import { anyRuleMatches } from "./rules.js";

export type PermissionContext = {
  mode: PermissionMode;
  alwaysAllowRules: string[];
  requestPermission?: (request: Omit<PermissionRequest, "resolve">) => Promise<PermissionResult>;
  planApproved: boolean;
};

export const createPermissionContext = (
  mode: PermissionMode,
  alwaysAllowRules: string[] = [],
  requestPermission?: PermissionContext["requestPermission"],
): PermissionContext => ({
  mode,
  alwaysAllowRules: [...alwaysAllowRules],
  requestPermission,
  planApproved: false,
});

export const checkToolPermission = async (
  context: PermissionContext,
  toolName: string,
  summary: string,
  isReadOnly: boolean,
  options?: { planFileEdit?: boolean },
): Promise<PermissionResult> => {
  if (context.mode === "bypassPermissions") {
    return { granted: true };
  }
  if (isReadOnly) {
    return { granted: true };
  }
  if (options?.planFileEdit && context.mode === "plan") {
    return { granted: true };
  }
  if (anyRuleMatches(context.alwaysAllowRules, toolName, summary)) {
    return { granted: true };
  }
  if (context.mode === "plan" && context.planApproved) {
    return { granted: true };
  }
  if (!context.requestPermission) {
    return { granted: false, reason: "permission prompt unavailable" };
  }
  return context.requestPermission({ toolName, summary });
};

export const approvePlan = (context: PermissionContext): PermissionContext => ({
  ...context,
  planApproved: true,
});

export const setPermissionMode = (
  context: PermissionContext,
  mode: PermissionMode,
): PermissionContext => ({
  ...context,
  mode,
  planApproved: mode === "plan" ? context.planApproved : false,
});

export const addAlwaysAllowRule = (
  context: PermissionContext,
  rule: string,
): PermissionContext => {
  if (!context.alwaysAllowRules.includes(rule)) {
    context.alwaysAllowRules.push(rule);
  }
  return context;
};
