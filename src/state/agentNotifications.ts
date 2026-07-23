import { loadHooksConfig } from "../services/hooks/loadHooks.js";
import { runHookEvent } from "../services/hooks/runHooks.js";
import { getCwd } from "../utils/cwd.js";

export type AgentNotification = {
  content: string;
  agentId: string;
  agentName?: string;
};

const pending: AgentNotification[] = [];
let subscriber: ((notification: AgentNotification) => void) | null = null;

export const enqueueNotification = (notification: AgentNotification): void => {
  pending.push(notification);
  subscriber?.(notification);
  void loadHooksConfig().then((hooks) =>
    runHookEvent(hooks, {
      event: "Notification",
      message: notification.content,
      summary: notification.agentId,
      cwd: getCwd(),
    }),
  );
};

export const drainNotifications = (): AgentNotification[] => {
  const drained = [...pending];
  pending.length = 0;
  return drained;
};

export const peekNotifications = (): AgentNotification[] => [...pending];

export const subscribeNotifications = (
  callback: (notification: AgentNotification) => void,
): (() => void) => {
  subscriber = callback;
  return () => {
    if (subscriber === callback) {
      subscriber = null;
    }
  };
};

const MAX_NOTIFICATION_RESULT_CHARS = 6000;

const capResult = (result: string): string =>
  result.length <= MAX_NOTIFICATION_RESULT_CHARS
    ? result
    : `${result.slice(0, MAX_NOTIFICATION_RESULT_CHARS)}\n[result truncated; full output available via TaskOutput]`;

export const formatTaskNotification = (input: {
  agentId: string;
  agentName?: string;
  description: string;
  status: "completed" | "failed" | "stopped" | "idle";
  result?: string;
  error?: string;
  branch?: string;
  diffstat?: string;
  worktreeRemoved?: boolean;
}): string => {
  const summary =
    input.status === "completed" || input.status === "idle"
      ? `Agent "${input.description}" completed`
      : input.status === "stopped"
        ? `Agent "${input.description}" was stopped`
        : `Agent "${input.description}" failed${input.error ? `: ${input.error}` : ""}`;
  const resultBlock = input.result ? `\n<result>${capResult(input.result)}</result>` : "";
  const branchBlock = input.branch ? `\n<branch>${input.branch}</branch>` : "";
  const diffBlock = input.diffstat ? `\n<diffstat>\n${input.diffstat}\n</diffstat>` : "";
  const removedBlock =
    input.worktreeRemoved === true ? "\n<worktree-removed>true</worktree-removed>" : "";
  return [
    "<task-notification>",
    `<task-id>${input.agentId}</task-id>`,
    input.agentName ? `<agent-name>${input.agentName}</agent-name>` : "",
    `<status>${input.status}</status>`,
    `<summary>${summary}</summary>`,
    resultBlock,
    branchBlock,
    diffBlock,
    removedBlock,
    "</task-notification>",
  ]
    .filter(Boolean)
    .join("\n");
};
