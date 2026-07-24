import {
  getAgentTask,
  getAgentTaskByIdOrName,
  listAgentTasksByTeam,
  updateAgentTask,
} from "../../state/agentTasks.js";
import type { ToolRuntime } from "../../Tool.js";
import type { ChatMessage } from "../../types/messages.js";
import { finalizeTaskWorktree, runAgentLoop } from "./agentLoop.js";
import { formatStopMessage, notifyAgentCompletion } from "./agentNotify.js";

export const continueAgent = async (
  target: string,
  message: string,
  runtime: ToolRuntime,
): Promise<string> => {
  const task = getAgentTaskByIdOrName(target);
  if (!task) {
    return `Unknown agent: ${target}`;
  }
  if (task.status === "stopped") {
    return `Agent ${task.id} is stopped`;
  }
  if (task.status === "running") {
    updateAgentTask(task.id, {
      pendingMessages: [...task.pendingMessages, message],
    });
    return `Message queued for running agent ${task.id}${task.name ? ` (${task.name})` : ""}`;
  }
  const messages: ChatMessage[] = [...task.messages, { role: "user", content: message }];
  updateAgentTask(task.id, {
    messages,
    status: "running",
    pendingMessages: [],
    abortController: task.abortController.signal.aborted
      ? new AbortController()
      : task.abortController,
  });
  return runAgentLoop(task.id, runtime, task.description, undefined, true);
};

export const broadcastToTeam = async (
  teamName: string,
  message: string,
  runtime: ToolRuntime,
): Promise<string> => {
  const members = listAgentTasksByTeam(teamName);
  if (members.length === 0) {
    return `No agents in team ${teamName}`;
  }
  const results = await Promise.all(
    members.map((task) => continueAgent(task.name ?? task.id, message, runtime)),
  );
  return results.join("\n");
};

export const stopAgent = async (taskId: string): Promise<string> => {
  const task = getAgentTask(taskId) ?? getAgentTaskByIdOrName(taskId);
  if (!task) {
    return `Unknown agent: ${taskId}`;
  }
  if (task.status === "stopped") {
    return `Agent ${task.id} is already stopped`;
  }
  task.abortController.abort();
  updateAgentTask(task.id, { status: "stopped" });
  const worktree = await finalizeTaskWorktree(task.id);
  notifyAgentCompletion(task.id, "stopped", undefined, undefined, worktree);
  return formatStopMessage(task.id, worktree);
};
