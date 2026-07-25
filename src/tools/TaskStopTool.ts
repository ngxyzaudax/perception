import { readFile } from "node:fs/promises";
import { z } from "zod";
import { buildTool } from "../Tool.js";
import { stopAgent } from "../services/agents/agentLifecycle.js";
import { stopCursorAgent } from "../services/cursor/stopCursorAgent.js";
import { getAgentTask, getAgentTaskByIdOrName } from "../state/agentTasks.js";
import { getCursorAgentTaskByIdOrAgentId } from "../state/cursorAgentTasks.js";
import { getTask, updateTask } from "../state/backgroundTasks.js";

const inputSchema = z.object({
  task_id: z.string().describe("Background task or agent id to stop"),
});

export const TaskStopTool = buildTool({
  name: "TaskStop",
  description: "Stop a running background shell task or agent",
  inputSchema,
  isReadOnly: () => false,
  summarize: (input) => input.task_id,
  call: async (input) => {
    const cursor = getCursorAgentTaskByIdOrAgentId(input.task_id);
    if (cursor) {
      return stopCursorAgent(cursor.id);
    }
    const agent = getAgentTask(input.task_id) ?? getAgentTaskByIdOrName(input.task_id);
    if (agent) {
      return stopAgent(agent.id);
    }
    const task = getTask(input.task_id);
    if (!task) {
      return `Unknown task: ${input.task_id}`;
    }
    if (task.status !== "running") {
      return `Task ${input.task_id} is already ${task.status}`;
    }
    try {
      process.kill(task.pid, "SIGTERM");
      updateTask(task.id, { status: "stopped", exitCode: 143 });
      return `Stopped task ${input.task_id}`;
    } catch (error) {
      const message = error instanceof Error ? error.message : "failed to stop task";
      return message;
    }
  },
});
