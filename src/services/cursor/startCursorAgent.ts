import { Agent, CursorAgentError, type SDKAgent } from "@cursor/sdk";
import type {
  CursorAgentRuntime,
  CursorAgentTask,
} from "../../state/cursorAgentTasks.js";
import {
  createCursorTaskId,
  getCursorAgentTask,
  registerCursorAgentTask,
  updateCursorAgentTask,
} from "../../state/cursorAgentTasks.js";
import type { AgentIsolation } from "../agents/agentNotify.js";
import { applyWorktreeNotice } from "../agents/worktreeNotice.js";
import { buildAgentOptions } from "./buildAgentOptions.js";
import { finishCursorBackgroundRun } from "./finishCursorBackgroundRun.js";
import {
  finalizeCursorCancelled,
  finalizeCursorRun,
  finalizeCursorStartupError,
  formatCursorStartMessage,
} from "./finalizeCursorRun.js";
import {
  finalizeCursorWorktree,
  prepareCursorWorktree,
} from "./cursorWorktree.js";
import { waitRunWithAbort } from "./waitRunWithAbort.js";

export type StartCursorAgentInput = {
  description: string;
  prompt: string;
  apiKey: string;
  runtime: CursorAgentRuntime;
  model: string;
  cwd: string;
  repoUrl?: string;
  startingRef?: string;
  autoCreatePr?: boolean;
  runInBackground: boolean;
  isolation?: AgentIsolation;
  signal?: AbortSignal;
};

export const startCursorAgent = async (input: StartCursorAgentInput): Promise<string> => {
  const taskId = createCursorTaskId();
  registerCursorAgentTask({
    id: taskId,
    agentId: taskId,
    runtime: input.runtime,
    description: input.description,
    status: "running",
    startedAt: new Date().toISOString(),
    cwd: input.cwd,
    repoUrl: input.repoUrl,
  });
  const worktree = await prepareCursorWorktree({
    taskId,
    runtime: input.runtime,
    isolation: input.isolation,
    runInBackground: input.runInBackground,
    fallbackCwd: input.cwd,
  });
  updateCursorAgentTask(taskId, {
    cwd: worktree.cwd,
    worktreeBranch: worktree.branch,
    worktreeGitRoot: worktree.gitRoot,
    worktreeHeadCommit: worktree.headCommit,
    isolated: worktree.isolated,
  });
  let agent: SDKAgent | undefined;
  try {
    agent = await Agent.create(
      buildAgentOptions({
        apiKey: input.apiKey,
        model: input.model,
        runtime: input.runtime,
        cwd: worktree.cwd,
        repoUrl: input.repoUrl,
        startingRef: input.startingRef,
        autoCreatePr: input.autoCreatePr,
        name: input.description,
      }),
    );
    updateCursorAgentTask(taskId, { agentId: agent.agentId });
    const prompt = applyWorktreeNotice(input.prompt, {
      cwd: worktree.cwd,
      branch: worktree.branch,
      isolated: worktree.isolated,
    });
    const run = await agent.send(prompt);
    updateCursorAgentTask(taskId, { runId: run.id, activeRun: run });
    if (input.runInBackground) {
      void finishCursorBackgroundRun(taskId, agent, run);
      return formatCursorStartMessage(taskId, agent.agentId, run.id, input.runtime, worktree);
    }
    if (input.signal?.aborted) {
      return finalizeCursorCancelled(requireTask(taskId), await finalizeCursorWorktree(requireTask(taskId)));
    }
    const result = await waitRunWithAbort(run, input.signal);
    const finalized = await finalizeCursorWorktree(requireTask(taskId));
    const message = finalizeCursorRun(requireTask(taskId), result, false, finalized);
    agent.close();
    return message;
  } catch (error) {
    agent?.close();
    const task = requireTask(taskId);
    const worktree = await finalizeCursorWorktree(task);
    const message = error instanceof CursorAgentError ? error.message : "cursor agent failed";
    return finalizeCursorStartupError(task, message, input.runInBackground, worktree);
  }
};

const requireTask = (taskId: string): CursorAgentTask => {
  const task = getCursorAgentTask(taskId);
  if (!task) {
    throw new Error(`Cursor task ${taskId} not found`);
  }
  return task;
};
