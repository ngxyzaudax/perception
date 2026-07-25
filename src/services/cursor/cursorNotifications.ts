import {
  enqueueNotification,
  formatTaskNotification,
} from "../../state/agentNotifications.js";
import type {
  CursorAgentTask,
  CursorAgentTaskStatus,
} from "../../state/cursorAgentTasks.js";
import type { CursorWorktreeResult } from "./cursorWorktree.js";

const notificationStatus = (
  status: CursorAgentTaskStatus,
): "completed" | "failed" | "stopped" =>
  status === "finished" ? "completed" : status === "cancelled" ? "stopped" : "failed";

export const notifyCursorTask = (
  task: CursorAgentTask,
  status: CursorAgentTaskStatus,
  result?: string,
  error?: string,
  worktree?: CursorWorktreeResult | null,
): void => {
  enqueueNotification({
    agentId: task.id,
    content: formatTaskNotification({
      agentId: task.id,
      description: task.description,
      status: notificationStatus(status),
      result,
      error,
      branch: worktree?.branch,
      diffstat: worktree?.diffstat,
      worktreeRemoved: worktree?.removed,
    }),
  });
};
