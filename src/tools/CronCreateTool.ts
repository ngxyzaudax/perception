import { z } from "zod";
import { buildTool } from "../Tool.js";
import { nextCronFire } from "../services/cron/cronParser.js";
import { createCronJob } from "../services/cron/cronStore.js";

const inputSchema = z.object({
  cron: z.string().describe("5-field cron expression in local time"),
  prompt: z.string().describe("Prompt to enqueue when the schedule fires"),
  recurring: z.boolean().optional().describe("Repeat on schedule (default true)"),
  durable: z.boolean().optional().describe("Persist across restarts"),
});

export const CronCreateTool = buildTool({
  name: "CronCreate",
  description: "Schedule a prompt to run on a cron expression",
  inputSchema,
  isReadOnly: () => false,
  summarize: (input) => input.cron,
  call: async (input) => {
    const nextFireAt = nextCronFire(input.cron).toISOString();
    const job = await createCronJob({
      cron: input.cron,
      prompt: input.prompt,
      recurring: input.recurring,
      durable: input.durable,
      nextFireAt,
    });
    return `Created cron ${job.id} next fire ${job.nextFireAt}`;
  },
});
