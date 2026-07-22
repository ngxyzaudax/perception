import { z } from "zod";
import { buildTool } from "../Tool.js";
import { updateWorkItem } from "../services/workItems/workItemStore.js";

const inputSchema = z.object({
  taskId: z.string().describe("Work item id"),
  subject: z.string().optional(),
  description: z.string().optional(),
  activeForm: z.string().optional(),
  status: z.enum(["pending", "in_progress", "completed", "deleted"]).optional(),
  addBlocks: z.array(z.string()).optional().describe("Task ids this item blocks"),
  addBlockedBy: z.array(z.string()).optional().describe("Task ids blocking this item"),
  owner: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const TaskUpdateTool = buildTool({
  name: "TaskUpdate",
  description: "Update a work item status, dependencies, or metadata",
  inputSchema,
  isReadOnly: () => false,
  summarize: (input) => input.taskId,
  call: async (input, context) => {
    const sessionId = context.runtime?.sessionId ?? "default";
    const updated = await updateWorkItem(sessionId, input.taskId, input);
    if (!updated) {
      return input.status === "deleted"
        ? `Deleted work item ${input.taskId}`
        : `Unknown work item: ${input.taskId}`;
    }
    return `Updated work item ${updated.id} [${updated.status}]`;
  },
});
