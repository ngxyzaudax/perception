export type BackgroundTaskStatus = "running" | "completed" | "failed" | "stopped";

export type BackgroundTask = {
  id: string;
  command: string;
  pid: number;
  status: BackgroundTaskStatus;
  outputPath: string;
  exitCode?: number;
  sessionId: string;
  startedAt: string;
};

const tasks = new Map<string, BackgroundTask>();
let activeSessionId = "default";

export const setActiveSessionId = (sessionId: string): void => {
  activeSessionId = sessionId;
};

export const getActiveSessionId = (): string => activeSessionId;

export const registerTask = (task: BackgroundTask): void => {
  tasks.set(task.id, task);
};

export const getTask = (taskId: string): BackgroundTask | undefined => tasks.get(taskId);

export const updateTask = (
  taskId: string,
  patch: Partial<BackgroundTask>,
): BackgroundTask | undefined => {
  const current = tasks.get(taskId);
  if (!current) {
    return undefined;
  }
  const next = { ...current, ...patch };
  tasks.set(taskId, next);
  return next;
};

export const listTasks = (sessionId?: string): BackgroundTask[] =>
  [...tasks.values()]
    .filter((task) => (sessionId ? task.sessionId === sessionId : true))
    .sort((left, right) => right.startedAt.localeCompare(left.startedAt));

export const formatTaskList = (sessionId?: string): string => {
  const entries = listTasks(sessionId);
  if (entries.length === 0) {
    return "no background tasks";
  }
  return entries
    .map(
      (task) =>
        `${task.id} [${task.status}] pid=${task.pid} exit=${task.exitCode ?? "-"} ${task.command}`,
    )
    .join("\n");
};

export const clearTasksForSession = (sessionId: string): void => {
  for (const [id, task] of tasks) {
    if (task.sessionId === sessionId) {
      tasks.delete(id);
    }
  }
};
