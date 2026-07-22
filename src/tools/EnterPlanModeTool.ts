import { z } from "zod";
import { buildTool } from "../Tool.js";
import { resolvePlanPath } from "../services/plans/planFiles.js";

const inputSchema = z.object({});

export const EnterPlanModeTool = buildTool({
  name: "EnterPlanMode",
  description: "Enter plan mode to explore and write a plan without mutating project files",
  inputSchema,
  isReadOnly: () => true,
  summarize: () => "enter plan mode",
  call: async (_input, context) => {
    if (!context.runtime?.updatePermissionMode) {
      return "Plan mode unavailable in this runtime";
    }
    context.runtime.updatePermissionMode("plan");
    const planPath = context.runtime.sessionId
      ? resolvePlanPath(context.runtime.sessionId)
      : "~/.perception/plans/<session>.md";
    return [
      "Plan mode enabled.",
      `Write your plan to: ${planPath}`,
      "Use ExitPlanMode when the plan is ready for approval.",
    ].join("\n");
  },
});
