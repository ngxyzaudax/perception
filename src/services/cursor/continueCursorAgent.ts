import { Agent, CursorAgentError, type SDKAgent } from "@cursor/sdk";
import type { CursorAgentRuntime } from "../../state/cursorAgentTasks.js";
import {
  getCursorAgentTaskByIdOrAgentId,
  updateCursorAgentTask,
} from "../../state/cursorAgentTasks.js";
import { applyWorktreeNotice } from "../agents/worktreeNotice.js";
import { buildResumeOptions } from "./buildAgentOptions.js";
import { finishCursorBackgroundRun } from "./finishCursorBackgroundRun.js";
import {
  finalizeCursorCancelled,
  finalizeCursorRun,
  finalizeCursorStartupError,
  formatCursorStartMessage,
} from "./finalizeCursorRun.js";
import {
  finalizeCursorWorktree,
  reuseCursorWorktree,
} from "./cursorWorktree.js";
import { waitRunWithAbort } from "./waitRunWithAbort.js";

export type ContinueCursorAgentInput = {
  agentId: string;
  prompt: string;
  apiKey: string;
  runtime: CursorAgentRuntime;
  model?: string;
  cwd: string;
  runInBackground: boolean;
  signal?: AbortSignal;
};

export const continueCursorAgent = async (input: ContinueCursorAgentInput): Promise<string> => {
  const task = getCursorAgentTaskByIdOrAgentId(input.agentId);
  if (!task) {
    return `Unknown Cursor agent: ${input.agentId}`;
  }
  if (task.status === "running" && task.activeRun) {
    return `Cursor agent ${task.agentId} is already running run ${task.runId ?? "-"}`;
  }
  const worktree = reuseCursorWorktree(task);
  let agent: SDKAgent | undefined;
  try {
    agent = await Agent.resume(task.agentId, buildResumeOptions({ ...input, cwd: worktree.cwd }));
    updateCursorAgentTask(task.id, { status: "running", resultText: undefined, errorText: undefined });
    const prompt = applyWorktreeNotice(input.prompt, {
      cwd: worktree.cwd,
      branch: worktree.branch,
      isolated: worktree.isolated,
    });
    const run = await agent.send(prompt);
    updateCursorAgentTask(task.id, { runId: run.id, activeRun: run });
    if (input.runInBackground) {
      void finishCursorBackgroundRun(task.id, agent, run);
      return formatCursorStartMessage(task.id, task.agentId, run.id, task.runtime, worktree);
    }
    if (input.signal?.aborted) {
      return finalizeCursorCancelled(task, await finalizeCursorWorktree(task));
    }
    const result = await waitRunWithAbort(run, input.signal);
    const finalized = await finalizeCursorWorktree(task);
    const message = finalizeCursorRun(task, result, false, finalized);
    agent.close();
    return message;
  } catch (error) {
    agent?.close();
    const finalized = await finalizeCursorWorktree(task);
    const message = error instanceof CursorAgentError ? error.message : "cursor agent failed";
    return finalizeCursorStartupError(task, message, input.runInBackground, finalized);
  }
};
