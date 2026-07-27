import { dirname } from "node:path";
import { appendFile, mkdir } from "node:fs/promises";
import { execa } from "execa";
import {
  getTask,
  getActiveSessionId,
  registerTask,
  updateTask,
  type BackgroundTask,
} from "../../state/backgroundTasks.js";
import {
  enqueueNotification,
  formatBackgroundTaskNotification,
} from "../../state/agentNotifications.js";
import { getCwd } from "../../utils/cwd.js";
import { createTaskId, taskOutputPath } from "./taskPaths.js";

export type BackgroundShellResult = {
  taskId: string;
  outputPath: string;
  pid: number;
};

export const runBackgroundShell = async (
  command: string,
  cwd: string = getCwd(),
): Promise<BackgroundShellResult> => {
  const sessionId = getActiveSessionId();
  const taskId = createTaskId();
  const outputPath = taskOutputPath(sessionId, taskId);
  await mkdir(dirname(outputPath), { recursive: true });

  const subprocess = execa("bash", ["-lc", command], {
    cwd,
    reject: false,
    env: process.env,
    stdin: "ignore",
    detached: process.platform !== "win32",
  });

  const task: BackgroundTask = {
    id: taskId,
    command,
    pid: subprocess.pid ?? 0,
    status: "running",
    outputPath,
    sessionId,
    startedAt: new Date().toISOString(),
  };
  registerTask(task);

  void streamBackgroundOutput(subprocess, taskId, outputPath);
  return { taskId, outputPath, pid: subprocess.pid ?? 0 };
};

const streamBackgroundOutput = async (
  subprocess: ReturnType<typeof execa>,
  taskId: string,
  outputPath: string,
): Promise<void> => {
  let pendingWrites = Promise.resolve();
  const queueWrite = (chunk: Buffer): void => {
    pendingWrites = pendingWrites.then(() => appendFile(outputPath, chunk));
  };
  subprocess.stdout?.on("data", (chunk: Buffer) => {
    queueWrite(chunk);
  });
  subprocess.stderr?.on("data", (chunk: Buffer) => {
    queueWrite(chunk);
  });
  const result = await subprocess;
  await pendingWrites.catch(() => undefined);
  completeBackgroundTask(taskId, outputPath, result.exitCode ?? 1);
};

const completeBackgroundTask = (
  taskId: string,
  outputPath: string,
  exitCode: number,
): void => {
  if (getTask(taskId)?.status === "stopped") {
    return;
  }
  const status = exitCode === 0 ? "completed" : "failed";
  updateTask(taskId, { status, exitCode });
  enqueueNotification({
    content: formatBackgroundTaskNotification({ taskId, status, exitCode, outputPath }),
    agentId: taskId,
  });
};
