import { z } from "zod";
import { buildTool } from "../Tool.js";
import { formatWorkItemList } from "../services/workItems/workItemStore.js";

const inputSchema = z.object({});

export const TaskListTool = buildTool({
  name: "TaskList",
  description: "List all work items for the current session",
  inputSchema,
  isReadOnly: () => true,
  summarize: () => "list work items",
  call: async (_input, context) => {
    const sessionId = context.runtime?.sessionId ?? "default";
    return formatWorkItemList(sessionId);
  },
});
