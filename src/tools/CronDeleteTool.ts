import { z } from "zod";
import { buildTool } from "../Tool.js";
import { deleteCronJob } from "../services/cron/cronStore.js";

const inputSchema = z.object({
  id: z.string().describe("Cron job id"),
});

export const CronDeleteTool = buildTool({
  name: "CronDelete",
  description: "Delete a scheduled cron job",
  inputSchema,
  isReadOnly: () => false,
  summarize: (input) => input.id,
  call: async (input) => {
    const deleted = await deleteCronJob(input.id);
    return deleted ? `Deleted cron ${input.id}` : `Unknown cron: ${input.id}`;
  },
});
