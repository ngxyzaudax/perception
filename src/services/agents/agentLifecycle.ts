import { appendFile } from "node:fs/promises";
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
import {
  enqueueNotification,
  formatTaskNotification,
} from "../../state/agentNotifications.js";
import { addTeamMember } from "../../state/teams.js";
import type { ToolRuntime } from "../../Tool.js";
import type { AgentDefinition } from "./loadAgents.js";
import type { ChatMessage } from "../../types/messages.js";
import { agentTranscriptPath } from "../tasks/taskPaths.js";
import { createAgentWorktree } from "../worktrees/createAgentWorktree.js";
import { finalizeAgentWorktree } from "../worktrees/finalizeAgentWorktree.js";
import { buildEnvironmentContext } from "../../context/systemPrompt.js";
import { runAgentTurn } from "./runAgentTurn.js";

export type AgentIsolation = "worktree" | "none";

export type StartAgentInput = {
  description: string;
  prompt: string;
  runtime: ToolRuntime;
  signal: AbortSignal;
  agent?: AgentDefinition;
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
    model: input.agent?.model,
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
  const startMessage = buildStartMessage(agentId, input.name, worktree, isolation);
  if (input.runInBackground) {
    void runAgentLoop(task.id, input.runtime, input.description, input.agent, true);
    return startMessage;
  }
  const result = await runAgentLoop(task.id, input.runtime, input.description, input.agent, true);
  return result;
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
  const messages: ChatMessage[] = [
    ...task.messages,
    { role: "user", content: message },
  ];
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
  notifyCompletion(task.id, "stopped", undefined, undefined, worktree);
  return formatStopMessage(task.id, worktree);
};

const runAgentLoop = async (
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
  const agentRuntime = buildAgentRuntime(runtime, task);
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
        notifyCompletion(taskId, "idle", turn.text, undefined, worktree);
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
    notifyCompletion(taskId, "failed", undefined, message, worktree);
    return message;
  }
};

const buildAgentRuntime = (runtime: ToolRuntime, task: AgentTask): ToolRuntime => ({
  ...runtime,
  cwd: task.cwd ?? runtime.cwd,
  agentScope: task.id,
});

const resolveAgentSystemPrompt = async (
  task: AgentTask,
  agent?: AgentDefinition,
): Promise<string | undefined> => {
  const environment = await buildEnvironmentContext(task.cwd ?? runtimeCwd(task));
  if (task.systemPromptOverride ?? agent?.systemPrompt) {
    return `${task.systemPromptOverride ?? agent?.systemPrompt}\n\n${environment}`;
  }
  return undefined;
};

const runtimeCwd = (task: AgentTask): string | undefined => task.cwd;

const finalizeTaskWorktree = async (taskId: string) => {
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

const notifyCompletion = (
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

const resolveIsolation = (
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

const tryCreateWorktree = async (agentId: string) => {
  try {
    return await createAgentWorktree(agentId);
  } catch {
    return null;
  }
};

const buildStartMessage = (
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

const formatStopMessage = (
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
