import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import {
  createAgentId,
  getAgentTask,
  getAgentTaskByIdOrName,
  listAgentTasksByTeam,
  registerAgentTask,
  updateAgentTask,
  type AgentTask,
} from "../../state/agentTasks.js";
import { addTeamMember } from "../../state/teams.js";
import type { ToolRuntime } from "../../Tool.js";
import type { AgentDefinition } from "./loadAgents.js";
import type { ChatMessage } from "../../types/messages.js";
import { agentTranscriptPath } from "../tasks/taskPaths.js";
import { finalizeTaskWorktree, runAgentLoop } from "./agentLoop.js";
import {
  buildStartMessage,
  formatStopMessage,
  notifyAgentCompletion,
  resolveIsolation,
  tryCreateWorktree,
  type AgentIsolation,
} from "./agentNotify.js";

export type { AgentIsolation };

export type StartAgentInput = {
  description: string;
  prompt: string;
  runtime: ToolRuntime;
  signal: AbortSignal;
  agent?: AgentDefinition;
  model?: string;
  runInBackground: boolean;
  name?: string;
  teamName?: string;
  isolation?: AgentIsolation;
};

export const startAgent = async (input: StartAgentInput): Promise<string> => {
  const agentId = createAgentId();
  const sessionId = input.runtime.sessionId ?? "default";
  const transcriptPath = agentTranscriptPath(sessionId, agentId);
  await mkdir(dirname(transcriptPath), { recursive: true });
  const abortController = new AbortController();
  const isolation = resolveIsolation(input.runInBackground, input.isolation);
  const worktree = isolation === "worktree" ? await tryCreateWorktree(agentId) : null;
  const task: AgentTask = {
    id: agentId,
    name: input.name,
    teamName: input.teamName,
    description: input.description,
    status: "running",
    messages: [{ role: "user", content: input.prompt }],
    systemPromptOverride: input.agent?.systemPrompt,
    model: input.model ?? input.agent?.model,
    pendingMessages: [],
    abortController,
    transcriptPath,
    sessionId,
    startedAt: new Date().toISOString(),
    cwd: worktree?.worktreePath,
    worktreeBranch: worktree?.branch,
    worktreeGitRoot: worktree?.gitRoot,
    worktreeHeadCommit: worktree?.headCommit,
    isolated: worktree !== null,
  };
  registerAgentTask(task);
  if (input.name && input.teamName) {
    await addTeamMember(input.teamName, input.name, agentId);
  }
  input.runtime.onEvent({
    type: "status",
    message: `Agent ${agentId} started: ${input.description}`,
  });
  const startMessage = buildStartMessage(agentId, input.name, worktree, isolation);
  if (input.runInBackground) {
    void runAgentLoop(task.id, input.runtime, input.description, input.agent, true);
    return startMessage;
  }
  return runAgentLoop(task.id, input.runtime, input.description, input.agent, true);
};

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
  updateAgentTask(task.id, { messages, status: "running", pendingMessages: [] });
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

export type { AgentTask };
