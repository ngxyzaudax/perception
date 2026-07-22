import { enqueueNotification } from "../../state/agentNotifications.js";
import { nextCronFire } from "./cronParser.js";
import {
  deleteCronJob,
  listCronJobs,
  loadDurableCronJobs,
  updateCronJob,
  type CronJob,
} from "./cronStore.js";

const CHECK_INTERVAL_MS = 1000;
let timer: ReturnType<typeof setInterval> | null = null;

export const startCronScheduler = (): void => {
  if (timer) {
    return;
  }
  void loadDurableCronJobs();
  timer = setInterval(() => {
    void tickCronScheduler();
  }, CHECK_INTERVAL_MS);
};

export const stopCronScheduler = (): void => {
  if (!timer) {
    return;
  }
  clearInterval(timer);
  timer = null;
};

const tickCronScheduler = async (): Promise<void> => {
  const now = Date.now();
  for (const job of listCronJobs()) {
    if (Date.parse(job.nextFireAt) <= now) {
      await fireCronJob(job);
    }
  }
};

const fireCronJob = async (job: CronJob): Promise<void> => {
  enqueueNotification({
    agentId: "cron",
    agentName: "scheduler",
    content: `<cron-notification>\n<prompt>${job.prompt}</prompt>\n</cron-notification>`,
  });
  if (!job.recurring) {
    await deleteCronJob(job.id);
    return;
  }
  const nextFireAt = nextCronFire(job.cron, new Date()).toISOString();
  await updateCronJob(job.id, {
    lastFiredAt: new Date().toISOString(),
    nextFireAt,
  });
};
