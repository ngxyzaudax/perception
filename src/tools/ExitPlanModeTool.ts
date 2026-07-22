import { z } from "zod";
import { buildTool } from "../Tool.js";
import { readPlanFile, resolvePlanPath } from "../services/plans/planFiles.js";

const inputSchema = z.object({});

export const ExitPlanModeTool = buildTool({
  name: "ExitPlanMode",
  description: "Present the plan for approval and exit plan mode",
  inputSchema,
  isReadOnly: () => true,
  summarize: () => "exit plan mode",
  call: async (_input, context) => {
    if (!context.runtime?.sessionId) {
      return "Session unavailable for plan exit";
    }
    const plan = await readPlanFile(context.runtime.sessionId);
    if (!plan || plan.trim().length === 0) {
      return "Plan file is empty. Write a plan before exiting plan mode.";
    }
    if (!context.runtime.permissionContext.requestPermission) {
      return "Plan approval unavailable in this runtime";
    }
    const result = await context.runtime.permissionContext.requestPermission({
      toolName: "ExitPlanMode",
      summary: resolvePlanPath(context.runtime.sessionId),
      preview: { oldContent: "", newContent: plan },
    });
    if (!result.granted) {
      return result.reason ?? "Plan approval denied";
    }
    context.runtime.updatePermissionMode?.("default");
    return "Plan approved. Plan mode exited.";
  },
});
