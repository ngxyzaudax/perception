import { z } from "zod";
import { buildTool } from "../Tool.js";
import { createWorkItem } from "../services/workItems/workItemStore.js";

const inputSchema = z.object({
  subject: z.string().describe("Short title for the work item"),
  description: z.string().describe("Detailed description"),
  activeForm: z.string().optional().describe("Present-tense label while in progress"),
  metadata: z.record(z.unknown()).optional().describe("Optional metadata"),
});

export const TaskCreateTool = buildTool({
  name: "TaskCreate",
  description: "Create a tracked work item with dependencies support",
  inputSchema,
  isReadOnly: () => false,
  summarize: (input) => input.subject,
  call: async (input, context) => {
    const sessionId = context.runtime?.sessionId ?? "default";
    const item = await createWorkItem(sessionId, input);
    return `Created work item ${item.id}: ${item.subject}`;
  },
});
