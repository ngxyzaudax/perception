import {
  getCursorAgentTaskByIdOrAgentId,
  updateCursorAgentTask,
} from "../../state/cursorAgentTasks.js";
import { finalizeCursorCancelled } from "./finalizeCursorRun.js";
import { finalizeCursorWorktree } from "./cursorWorktree.js";

export const stopCursorAgent = async (target: string): Promise<string> => {
  const task = getCursorAgentTaskByIdOrAgentId(target);
  if (!task) {
    return `Unknown Cursor agent: ${target}`;
  }
  if (task.status !== "running") {
    return `Cursor agent ${task.agentId} is already ${task.status}`;
  }
  const run = task.activeRun;
  if (run?.supports("cancel")) {
    await run.cancel();
  }
  const current = getCursorAgentTaskByIdOrAgentId(task.id);
  if (!current || current.status !== "running") {
    return `Cursor agent ${task.agentId} is already ${current?.status ?? "unknown"}`;
  }
  updateCursorAgentTask(current.id, { activeRun: undefined });
  return finalizeCursorCancelled(
    current,
    await finalizeCursorWorktree(current),
    true,
  );
};
