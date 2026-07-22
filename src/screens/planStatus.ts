import { readPlanFile, resolvePlanPath } from "../services/plans/planFiles.js";
import type { PermissionMode } from "../types/permissions.js";

export const formatPlanStatus = async (
  sessionId: string,
  permissionMode: PermissionMode,
): Promise<string> => {
  const plan = await readPlanFile(sessionId);
  const path = resolvePlanPath(sessionId);
  if (!plan) {
    return [
      `plan mode: ${permissionMode}`,
      `plan file: ${path}`,
      "plan content: empty",
    ].join("\n");
  }
  return [`plan mode: ${permissionMode}`, `plan file: ${path}`, plan].join("\n\n");
};
