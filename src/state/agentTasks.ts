import type { ChatMessage } from "../types/messages.js";

export type AgentTaskStatus = "running" | "idle" | "failed" | "stopped";

export type AgentTask = {
  id: string;
  name?: string;
  teamName?: string;
  description: string;
  status: AgentTaskStatus;
  messages: ChatMessage[];
  systemPromptOverride?: string;
  model?: string;
  pendingMessages: string[];
  abortController: AbortController;
  resultText?: string;
  transcriptPath: string;
  sessionId: string;
  startedAt: string;
  cwd?: string;
  worktreeBranch?: string;
  worktreeGitRoot?: string;
  worktreeHeadCommit?: string;
  isolated?: boolean;
};

const tasks = new Map<string, AgentTask>();
const nameIndex = new Map<string, string>();

export const registerAgentTask = (task: AgentTask): void => {
  tasks.set(task.id, task);
  if (task.name) {
    nameIndex.set(task.name.toLowerCase(), task.id);
  }
};

export const updateAgentTask = (
  taskId: string,
  patch: Partial<Omit<AgentTask, "id">>,
): AgentTask | undefined => {
  const current = tasks.get(taskId);
  if (!current) {
    return undefined;
  }
  if (patch.name !== undefined && current.name && current.name !== patch.name) {
    nameIndex.delete(current.name.toLowerCase());
  }
  const next = { ...current, ...patch };
  tasks.set(taskId, next);
  if (next.name) {
    nameIndex.set(next.name.toLowerCase(), taskId);
  }
  return next;
};

export const getAgentTask = (taskId: string): AgentTask | undefined => tasks.get(taskId);

export const getAgentTaskByIdOrName = (target: string): AgentTask | undefined => {
  const byId = tasks.get(target);
  if (byId) {
    return byId;
  }
  const id = nameIndex.get(target.toLowerCase());
  return id ? tasks.get(id) : undefined;
};

export const listAgentTasks = (sessionId?: string): AgentTask[] =>
  [...tasks.values()]
    .filter((task) => (sessionId ? task.sessionId === sessionId : true))
    .sort((left, right) => right.startedAt.localeCompare(left.startedAt));

export const listAgentTasksByTeam = (teamName: string): AgentTask[] =>
  [...tasks.values()].filter((task) => task.teamName === teamName);

export const formatAgentTaskList = (sessionId?: string): string => {
  const entries = listAgentTasks(sessionId);
  if (entries.length === 0) {
    return "no agent tasks";
  }
  return entries
    .map((task) => {
      const isolation =
        task.isolated && task.worktreeBranch
          ? ` branch=${task.worktreeBranch} cwd=${task.cwd ?? "-"}`
          : "";
      return `${task.id}${task.name ? ` (${task.name})` : ""} [${task.status}] ${task.description}${isolation}`;
    })
    .join("\n");
};

export const createAgentId = (): string =>
  `agent-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
