import {
  getAgentTask,
} from "../../state/agentTasks.js";
import {
  enqueueNotification,
  formatTaskNotification,
} from "../../state/agentNotifications.js";
import { createAgentWorktree } from "../worktrees/createAgentWorktree.js";
import { finalizeAgentWorktree } from "../worktrees/finalizeAgentWorktree.js";

export type AgentIsolation = "worktree" | "none";

export const notifyAgentCompletion = (
  taskId: string,
  status: "idle" | "failed" | "stopped",
  result?: string,
  error?: string,
  worktree?: Awaited<ReturnType<typeof finalizeAgentWorktree>> | null,
): void => {
  const task = getAgentTask(taskId);
  if (!task) {
    return;
  }
  const notificationStatus =
    status === "idle" ? "completed" : status === "failed" ? "failed" : "stopped";
  const content = formatTaskNotification({
    agentId: task.id,
    agentName: task.name,
    description: task.description,
    status: notificationStatus,
    result,
    error,
    branch: worktree?.branch,
    diffstat: worktree?.diffstat,
    worktreeRemoved: worktree?.removed,
  });
  enqueueNotification({ content, agentId: task.id, agentName: task.name });
};

export const resolveIsolation = (
  runInBackground: boolean,
  isolation?: AgentIsolation,
): AgentIsolation => {
  if (isolation === "none") {
    return "none";
  }
  if (isolation === "worktree") {
    return "worktree";
  }
  return runInBackground ? "worktree" : "none";
};

export const tryCreateWorktree = async (agentId: string) => {
  try {
    return await createAgentWorktree(agentId);
  } catch {
    return null;
  }
};

export const buildStartMessage = (
  agentId: string,
  name: string | undefined,
  worktree: Awaited<ReturnType<typeof createAgentWorktree>> | null,
  isolation: AgentIsolation,
): string => {
  const label = name ? ` (${name})` : "";
  if (worktree) {
    return `Started background agent ${agentId}${label} in worktree ${worktree.worktreePath} on branch ${worktree.branch}. You will be notified when it completes.`;
  }
  if (isolation === "worktree") {
    return `Started background agent ${agentId}${label} in shared tree (worktree unavailable). You will be notified when it completes.`;
  }
  return `Started background agent ${agentId}${label}. You will be notified when it completes.`;
};

export const formatStopMessage = (
  agentId: string,
  worktree: Awaited<ReturnType<typeof finalizeAgentWorktree>> | null,
): string => {
  const base = `Stopped agent ${agentId}`;
  if (!worktree) {
    return base;
  }
  if (worktree.hasChanges) {
    return `${base}. Changes committed on branch ${worktree.branch}.`;
  }
  if (worktree.removed) {
    return `${base}. Worktree removed (no changes).`;
  }
  return base;
};
