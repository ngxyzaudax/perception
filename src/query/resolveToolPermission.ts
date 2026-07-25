import type { AnyToolDefinition, ToolUseContext } from "../Tool.js";
import {
  checkToolPermission,
  type PermissionContext,
} from "../permissions/checkPermission.js";
import { suggestPersistRule } from "../permissions/persistRule.js";
import { checkPathSafety } from "../permissions/pathSafety.js";
import { isPlanFilePath } from "../services/plans/planFiles.js";
import type { PermissionResult } from "../types/permissions.js";
import { expandPath } from "../utils/path.js";
import type { QueryRuntimeExtras } from "./queryEngine.js";

export const resolvePermission = async (
  tool: AnyToolDefinition,
  parsedInput: unknown,
  toolContext: ToolUseContext,
  input: {
    permissionContext: PermissionContext;
    runtimeExtras?: QueryRuntimeExtras;
    signal?: AbortSignal;
  },
): Promise<PermissionResult> => {
  if (tool.checkPermissions) {
    const early = await tool.checkPermissions(parsedInput, toolContext);
    if (early) {
      return early;
    }
  }

  const pathGate = pathPermissionOptions(tool.name, parsedInput, toolContext, input.permissionContext);
  if (pathGate.pathDenied) {
    return { granted: false, reason: pathGate.pathDenied };
  }

  const preview = tool.getPreview ? await tool.getPreview(parsedInput, toolContext) : undefined;
  const summary = tool.summarize(parsedInput);
  const planFileEdit = isPlanFileEdit(
    tool.name,
    parsedInput,
    input.runtimeExtras?.sessionId,
    toolContext.cwd,
  );
  const permission = await checkToolPermission(
    { ...input.permissionContext, requestPermission: undefined },
    tool.name,
    summary,
    tool.isReadOnly(parsedInput),
    {
      planFileEdit,
      needsExplicitPermission: tool.needsExplicitPermission?.(parsedInput) === true,
      forceAsk: pathGate.forceAsk,
      pathDenied: pathGate.pathDenied,
    },
  );
  if (permission.granted) {
    return permission;
  }
  const suggestedPersistRule = suggestPersistRule(tool.name, summary) ?? undefined;
  const response = await input.permissionContext.requestPermission?.(
    {
      toolName: tool.name,
      summary,
      preview,
      suggestedPersistRule,
    },
    input.signal,
  );
  return response ?? { granted: false, reason: "permission prompt unavailable" };
};

const pathPermissionOptions = (
  toolName: string,
  parsedInput: unknown,
  toolContext: ToolUseContext,
  permissionContext: PermissionContext,
): { pathDenied?: string; forceAsk?: boolean } => {
  if (toolName !== "Edit" && toolName !== "Write" && toolName !== "Read") {
    return {};
  }
  const filePath = (parsedInput as { file_path?: string }).file_path;
  if (!filePath) {
    return {};
  }
  const absolute = expandPath(filePath, toolContext.cwd);
  const safety = checkPathSafety(
    absolute,
    toolContext.cwd,
    permissionContext.additionalDirectories,
  );
  if (!safety.ok) {
    return { pathDenied: safety.reason };
  }
  if (safety.sensitive) {
    return { forceAsk: true };
  }
  return {};
};

const isPlanFileEdit = (
  toolName: string,
  parsedInput: unknown,
  sessionId?: string,
  cwd?: string,
): boolean => {
  if (!sessionId || (toolName !== "Edit" && toolName !== "Write")) {
    return false;
  }
  const filePath = (parsedInput as { file_path?: string }).file_path;
  if (!filePath) {
    return false;
  }
  return isPlanFilePath(expandPath(filePath, cwd), sessionId);
};
