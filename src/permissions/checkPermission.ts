import type { PermissionMode, PermissionResult } from "../types/permissions.js";
import type { PermissionRequest } from "../types/permissions.js";
import { anyRuleMatches } from "./rules.js";

export type PermissionContext = {
  mode: PermissionMode;
  alwaysAllowRules: string[];
  denyRules: string[];
  askRules: string[];
  allowedDomains: string[];
  additionalDirectories: string[];
  requestPermission?: (request: Omit<PermissionRequest, "resolve">) => Promise<PermissionResult>;
  planApproved: boolean;
};

export type PermissionContextInput = {
  mode: PermissionMode;
  alwaysAllowRules?: string[];
  denyRules?: string[];
  askRules?: string[];
  allowedDomains?: string[];
  additionalDirectories?: string[];
  requestPermission?: PermissionContext["requestPermission"];
};

export const createPermissionContext = (
  modeOrInput: PermissionMode | PermissionContextInput,
  alwaysAllowRules: string[] = [],
  requestPermission?: PermissionContext["requestPermission"],
): PermissionContext => {
  if (typeof modeOrInput === "string") {
    return {
      mode: modeOrInput,
      alwaysAllowRules: [...alwaysAllowRules],
      denyRules: [],
      askRules: [],
      allowedDomains: [],
      additionalDirectories: [],
      requestPermission,
      planApproved: false,
    };
  }
  return {
    mode: modeOrInput.mode,
    alwaysAllowRules: [...(modeOrInput.alwaysAllowRules ?? [])],
    denyRules: [...(modeOrInput.denyRules ?? [])],
    askRules: [...(modeOrInput.askRules ?? [])],
    allowedDomains: [...(modeOrInput.allowedDomains ?? [])],
    additionalDirectories: [...(modeOrInput.additionalDirectories ?? [])],
    requestPermission: modeOrInput.requestPermission,
    planApproved: false,
  };
};

export const checkToolPermission = async (
  context: PermissionContext,
  toolName: string,
  summary: string,
  isReadOnly: boolean,
  options?: {
    planFileEdit?: boolean;
    needsExplicitPermission?: boolean;
    forceAsk?: boolean;
    pathDenied?: string;
  },
): Promise<PermissionResult> => {
  if (anyRuleMatches(context.denyRules, toolName, summary)) {
    return { granted: false, reason: `Denied by rule for ${toolName}` };
  }
  if (options?.pathDenied) {
    return { granted: false, reason: options.pathDenied };
  }
  const forceAsk =
    options?.forceAsk === true || anyRuleMatches(context.askRules, toolName, summary);
  const needsExplicit = options?.needsExplicitPermission === true;
  if (!forceAsk && context.mode === "bypassPermissions") {
    return { granted: true };
  }
  if (!forceAsk && isReadOnly && !needsExplicit) {
    return { granted: true };
  }
  if (!forceAsk && options?.planFileEdit && context.mode === "plan") {
    return { granted: true };
  }
  if (!forceAsk && !needsExplicit && anyRuleMatches(context.alwaysAllowRules, toolName, summary)) {
    return { granted: true };
  }
  if (!forceAsk && context.mode === "plan" && context.planApproved) {
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
