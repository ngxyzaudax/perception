import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import {
  createAgentId,
  registerAgentTask,
  type AgentTask,
} from "../../state/agentTasks.js";
import { addTeamMember } from "../../state/teams.js";
import type { ToolRuntime } from "../../Tool.js";
import type { AgentDefinition } from "./loadAgents.js";
import { agentTranscriptPath } from "../tasks/taskPaths.js";
import { runAgentLoop } from "./agentLoop.js";
import { linkParentAbort } from "./linkParentAbort.js";
import {
  buildStartMessage,
  resolveIsolation,
  tryCreateWorktree,
  type AgentIsolation,
} from "./agentNotify.js";

export type { AgentIsolation };
export { continueAgent, broadcastToTeam, stopAgent } from "./agentControl.js";
export type { AgentTask };

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
  const unlinkParentAbort = linkParentAbort(input.signal, abortController, input.runInBackground);
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
  try {
    return await runAgentLoop(task.id, input.runtime, input.description, input.agent, true);
  } finally {
    unlinkParentAbort();
  }
};
