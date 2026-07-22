import { z } from "zod";
import { buildTool } from "../Tool.js";
import { listCronJobs } from "../services/cron/cronStore.js";

const inputSchema = z.object({});

export const CronListTool = buildTool({
  name: "CronList",
  description: "List scheduled cron jobs",
  inputSchema,
  isReadOnly: () => true,
  summarize: () => "list cron jobs",
  call: async () => {
    const jobs = listCronJobs();
    if (jobs.length === 0) {
      return "no cron jobs";
    }
    return jobs
      .map(
        (job) =>
          `${job.id} cron=${job.cron} recurring=${job.recurring} next=${job.nextFireAt} prompt=${job.prompt.slice(0, 60)}`,
      )
      .join("\n");
  },
});
