import type { RunResult } from "@cursor/sdk";
import {
  updateCursorAgentTask,
  type CursorAgentTask,
  type CursorAgentTaskStatus,
} from "../../state/cursorAgentTasks.js";
import { notifyCursorTask } from "./cursorNotifications.js";
import type { CursorWorktreeResult } from "./cursorWorktree.js";

export const finalizeCursorRun = (
  task: CursorAgentTask,
  result: RunResult,
  notify: boolean,
  worktree?: CursorWorktreeResult | null,
): string => {
  const status = mapRunStatus(result.status);
  const patch = {
    status,
    runId: result.id,
    resultText: result.result,
    errorText: result.error?.message,
    activeRun: undefined,
  };
  updateCursorAgentTask(task.id, patch);
  if (notify) {
    notifyCursorTask(task, status, result.result, result.error?.message, worktree);
  }
  return formatCursorResult(task.id, task.agentId, status, result.result, result.error?.message, worktree);
};

export const finalizeCursorCancelled = (
  task: CursorAgentTask,
  worktree?: CursorWorktreeResult | null,
  notify: boolean = false,
): string => {
  const result = "Cursor agent cancelled before completion";
  updateCursorAgentTask(task.id, {
    status: "cancelled",
    resultText: result,
    activeRun: undefined,
  });
  if (notify) {
    notifyCursorTask(task, "cancelled", result, undefined, worktree);
  }
  return formatCursorResult(
    task.id,
    task.agentId,
    "cancelled",
    result,
    undefined,
    worktree,
  );
};

export const finalizeCursorStartupError = (
  task: CursorAgentTask,
  message: string,
  notify: boolean = false,
  worktree?: CursorWorktreeResult | null,
): string => {
  updateCursorAgentTask(task.id, {
    status: "error",
    errorText: message,
    activeRun: undefined,
  });
  if (notify) {
    notifyCursorTask(task, "error", undefined, message, worktree);
  }
  return formatCursorResult(task.id, task.agentId, "error", undefined, message, worktree);
};

const mapRunStatus = (status: RunResult["status"]): CursorAgentTaskStatus => {
  if (status === "finished") {
    return "finished";
  }
  if (status === "cancelled") {
    return "cancelled";
  }
  return "error";
};

const formatWorktreeSummary = (worktree?: CursorWorktreeResult | null): string => {
  if (!worktree) {
    return "";
  }
  if (worktree.hasChanges) {
    return `\nChanges committed on branch ${worktree.branch}.`;
  }
  if (worktree.removed) {
    return "\nWorktree removed (no changes).";
  }
  return "";
};

export const formatCursorResult = (
  taskId: string,
  agentId: string,
  status: CursorAgentTaskStatus,
  result?: string,
  error?: string,
  worktree?: CursorWorktreeResult | null,
): string => {
  const base = `Cursor agent ${agentId} (${taskId}) ${status}`;
  const worktreeSummary = formatWorktreeSummary(worktree);
  if (error) {
    return `${base}: ${error}${worktreeSummary}`;
  }
  if (result && result.trim().length > 0) {
    return `${base}\n${result}${worktreeSummary}`;
  }
  return `${base}${worktreeSummary}`;
};

export const formatCursorStartMessage = (
  taskId: string,
  agentId: string,
  runId: string,
  runtime: string,
  worktree?: { cwd: string; branch?: string; isolated: boolean },
): string => {
  const location =
    worktree?.isolated && worktree.branch
      ? ` in worktree ${worktree.cwd} on branch ${worktree.branch}`
      : "";
  return `Started Cursor ${runtime} agent ${agentId} (task ${taskId}, run ${runId})${location}. You will be notified when it completes.`;
};
