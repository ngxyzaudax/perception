import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getCwd } from "../../utils/cwd.js";

export type CronJob = {
  id: string;
  cron: string;
  prompt: string;
  recurring: boolean;
  durable: boolean;
  createdAt: string;
  lastFiredAt?: string;
  nextFireAt: string;
};

const MAX_JOBS = 50;
const sessionJobs = new Map<string, CronJob>();

export const createCronJob = async (input: {
  cron: string;
  prompt: string;
  recurring?: boolean;
  durable?: boolean;
  nextFireAt: string;
}): Promise<CronJob> => {
  const jobs = await listAllCronJobs();
  if (jobs.length >= MAX_JOBS) {
    throw new Error(`maximum ${MAX_JOBS} cron jobs reached`);
  }
  const job: CronJob = {
    id: createCronId(),
    cron: input.cron,
    prompt: input.prompt,
    recurring: input.recurring ?? true,
    durable: input.durable ?? false,
    createdAt: new Date().toISOString(),
    nextFireAt: input.nextFireAt,
  };
  sessionJobs.set(job.id, job);
  if (job.durable) {
    await persistDurableJobs();
  }
  return job;
};

export const deleteCronJob = async (jobId: string): Promise<boolean> => {
  const existed = sessionJobs.delete(jobId);
  await persistDurableJobs();
  return existed;
};

export const listCronJobs = (): CronJob[] =>
  [...sessionJobs.values()].sort((left, right) => left.createdAt.localeCompare(right.createdAt));

export const updateCronJob = async (
  jobId: string,
  patch: Partial<Pick<CronJob, "lastFiredAt" | "nextFireAt">>,
): Promise<CronJob | undefined> => {
  const current = sessionJobs.get(jobId);
  if (!current) {
    return undefined;
  }
  const next = { ...current, ...patch };
  sessionJobs.set(jobId, next);
  if (next.durable) {
    await persistDurableJobs();
  }
  return next;
};

export const loadDurableCronJobs = async (): Promise<void> => {
  const path = durableCronPath();
  try {
    const raw = await readFile(path, "utf8");
    const parsed = JSON.parse(raw) as { tasks?: CronJob[] };
    for (const job of parsed.tasks ?? []) {
      sessionJobs.set(job.id, job);
    }
  } catch {
    return;
  }
};

const listAllCronJobs = async (): Promise<CronJob[]> => {
  await loadDurableCronJobs();
  return listCronJobs();
};

const persistDurableJobs = async (): Promise<void> => {
  const path = durableCronPath();
  await mkdir(join(getCwd(), ".perception"), { recursive: true });
  const tasks = listCronJobs().filter((job) => job.durable);
  await writeFile(path, `${JSON.stringify({ tasks }, null, 2)}\n`, "utf8");
};

const durableCronPath = (): string => join(getCwd(), ".perception", "scheduled_tasks.json");

const createCronId = (): string =>
  `cron-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
