import type { Run } from "@cursor/sdk";

export type CursorAgentTaskStatus = "running" | "finished" | "error" | "cancelled";

export type CursorAgentRuntime = "local" | "cloud";

export type CursorAgentTask = {
  id: string;
  agentId: string;
  runId?: string;
  runtime: CursorAgentRuntime;
  description: string;
  status: CursorAgentTaskStatus;
  resultText?: string;
  errorText?: string;
  startedAt: string;
  cwd?: string;
  repoUrl?: string;
  activeRun?: Run;
  worktreeBranch?: string;
  worktreeGitRoot?: string;
  worktreeHeadCommit?: string;
  isolated?: boolean;
};

const tasks = new Map<string, CursorAgentTask>();
const agentIndex = new Map<string, string>();

export const createCursorTaskId = (): string =>
  `cursor-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const registerCursorAgentTask = (task: CursorAgentTask): void => {
  tasks.set(task.id, task);
  agentIndex.set(task.agentId, task.id);
};

export const updateCursorAgentTask = (
  taskId: string,
  patch: Partial<Omit<CursorAgentTask, "id">>,
): CursorAgentTask | undefined => {
  const current = tasks.get(taskId);
  if (!current) {
    return undefined;
  }
  const next = { ...current, ...patch };
  tasks.set(taskId, next);
  if (patch.agentId && patch.agentId !== current.agentId) {
    agentIndex.delete(current.agentId);
    agentIndex.set(patch.agentId, taskId);
  }
  return next;
};

export const getCursorAgentTask = (taskId: string): CursorAgentTask | undefined =>
  tasks.get(taskId);

export const getCursorAgentTaskByAgentId = (agentId: string): CursorAgentTask | undefined => {
  const taskId = agentIndex.get(agentId) ?? agentId;
  return tasks.get(taskId);
};

export const getCursorAgentTaskByIdOrAgentId = (
  target: string,
): CursorAgentTask | undefined =>
  getCursorAgentTask(target) ?? getCursorAgentTaskByAgentId(target);

export const listCursorAgentTasks = (): CursorAgentTask[] =>
  [...tasks.values()].sort((left, right) => right.startedAt.localeCompare(left.startedAt));
