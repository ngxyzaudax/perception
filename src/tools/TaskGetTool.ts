import { z } from "zod";
import { buildTool } from "../Tool.js";
import { getWorkItem } from "../services/workItems/workItemStore.js";

const inputSchema = z.object({
  taskId: z.string().describe("Work item id"),
});

export const TaskGetTool = buildTool({
  name: "TaskGet",
  description: "Get a work item by id",
  inputSchema,
  isReadOnly: () => true,
  summarize: (input) => input.taskId,
  call: async (input, context) => {
    const sessionId = context.runtime?.sessionId ?? "default";
    const item = await getWorkItem(sessionId, input.taskId);
    if (!item) {
      return `Unknown work item: ${input.taskId}`;
    }
    return JSON.stringify(item, null, 2);
  },
});
