import {
  getAgentTask,
  updateAgentTask,
} from "../../state/agentTasks.js";
import type { ToolRuntime } from "../../Tool.js";
import type { AgentDefinition } from "./loadAgents.js";
import type { ChatMessage } from "../../types/messages.js";
import { finalizeAgentWorktree } from "../worktrees/finalizeAgentWorktree.js";
import { buildEnvironmentContext } from "../../context/systemPrompt.js";
import { runAgentTurn } from "./runAgentTurn.js";
import { notifyAgentCompletion } from "./agentNotify.js";
import { runHookEvent } from "../hooks/runHooks.js";
import { getCwd } from "../../utils/cwd.js";

export const runAgentLoop = async (
  taskId: string,
  runtime: ToolRuntime,
  description: string,
  agent: AgentDefinition | undefined,
  suppressStream: boolean,
): Promise<string> => {
  const task = getAgentTask(taskId);
  if (!task) {
    return `Agent ${taskId} not found`;
  }
  const agentRuntime = {
    ...runtime,
    cwd: task.cwd ?? runtime.cwd,
    agentScope: task.id,
  };
  try {
    while (true) {
      const current = getAgentTask(taskId);
      if (!current || current.status === "stopped") {
        return current?.resultText ?? "Agent stopped";
      }
      const systemPrompt = await resolveAgentSystemPrompt(current, agent);
      const turn = await runAgentTurn({
        description,
        messages: current.messages,
        runtime: agentRuntime,
        signal: current.abortController.signal,
        agent,
        systemPromptOverride: systemPrompt,
        model: current.model,
        transcriptPath: current.transcriptPath,
        suppressStream,
      });
      const pending = getAgentTask(taskId)?.pendingMessages ?? [];
      updateAgentTask(taskId, {
        messages: turn.messages,
        resultText: turn.text,
        status: pending.length > 0 ? "running" : "idle",
      });
      if (pending.length === 0) {
        const worktree = await finalizeTaskWorktree(taskId);
        runtime.onEvent({
          type: "status",
          message: `Agent ${taskId} finished: ${description}`,
        });
        fireSubagentStop(agentRuntime, taskId, turn.text);
        notifyAgentCompletion(taskId, "idle", turn.text, undefined, worktree);
        return turn.text;
      }
      const nextMessages: ChatMessage[] = [
        ...turn.messages,
        ...pending.map((content) => ({ role: "user" as const, content })),
      ];
      updateAgentTask(taskId, { messages: nextMessages, pendingMessages: [], status: "running" });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "agent failed";
    updateAgentTask(taskId, { status: "failed", resultText: message });
    const worktree = await finalizeTaskWorktree(taskId);
    fireSubagentStop(agentRuntime, taskId, message);
    notifyAgentCompletion(taskId, "failed", undefined, message, worktree);
    return message;
  }
};

const fireSubagentStop = (
  runtime: ToolRuntime,
  taskId: string,
  resultText: string,
): void => {
  void runHookEvent(runtime.hooksConfig ?? runtime.settings.hooks ?? {}, {
    event: "SubagentStop",
    summary: taskId,
    message: resultText,
    cwd: runtime.cwd ?? getCwd(),
  });
};

const resolveAgentSystemPrompt = async (
  task: NonNullable<ReturnType<typeof getAgentTask>>,
  agent?: AgentDefinition,
): Promise<string | undefined> => {
  const environment = await buildEnvironmentContext(task.cwd);
  if (task.systemPromptOverride ?? agent?.systemPrompt) {
    return `${task.systemPromptOverride ?? agent?.systemPrompt}\n\n${environment}`;
  }
  return undefined;
};

export const finalizeTaskWorktree = async (taskId: string) => {
  const task = getAgentTask(taskId);
  if (!task?.isolated || !task.cwd || !task.worktreeBranch || !task.worktreeGitRoot || !task.worktreeHeadCommit) {
    return null;
  }
  return finalizeAgentWorktree({
    worktreePath: task.cwd,
    branch: task.worktreeBranch,
    gitRoot: task.worktreeGitRoot,
    headCommit: task.worktreeHeadCommit,
    agentId: task.id,
    description: task.description,
    removeWhenClean: true,
  });
};
