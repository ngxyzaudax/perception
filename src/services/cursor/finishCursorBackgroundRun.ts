import { CursorAgentError, type SDKAgent } from "@cursor/sdk";
import { getCursorAgentTask } from "../../state/cursorAgentTasks.js";
import {
  finalizeCursorRun,
  finalizeCursorStartupError,
} from "./finalizeCursorRun.js";
import { finalizeCursorWorktree } from "./cursorWorktree.js";

type CursorRun = Awaited<ReturnType<SDKAgent["send"]>>;

const errorMessage = (error: unknown): string =>
  error instanceof CursorAgentError ? error.message : "cursor agent failed";

export const finishCursorBackgroundRun = async (
  taskId: string,
  agent: SDKAgent,
  run: CursorRun,
): Promise<void> => {
  try {
    const result = await run.wait();
    const task = getCursorAgentTask(taskId);
    if (!task || task.status !== "running") {
      return;
    }
    const worktree = await finalizeCursorWorktree(task);
    finalizeCursorRun(task, result, true, worktree);
  } catch (error) {
    const task = getCursorAgentTask(taskId);
    if (!task || task.status !== "running") {
      return;
    }
    const worktree = await finalizeCursorWorktree(task);
    finalizeCursorStartupError(task, errorMessage(error), true, worktree);
  } finally {
    agent.close();
  }
};
