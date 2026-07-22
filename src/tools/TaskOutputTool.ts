import { readFile } from "node:fs/promises";
import { z } from "zod";
import { buildTool } from "../Tool.js";
import { getAgentTask, getAgentTaskByIdOrName } from "../state/agentTasks.js";
import { getTask } from "../state/backgroundTasks.js";

const inputSchema = z.object({
  task_id: z.string().describe("Background task or agent id"),
  tail_lines: z.number().int().positive().optional().describe("Number of lines to return"),
});

export const TaskOutputTool = buildTool({
  name: "TaskOutput",
  description: "Read output from a background shell task or agent transcript",
  inputSchema,
  isReadOnly: () => true,
  summarize: (input) => input.task_id,
  call: async (input) => {
    const agent = getAgentTask(input.task_id) ?? getAgentTaskByIdOrName(input.task_id);
    if (agent) {
      let output = agent.resultText ?? "";
      try {
        const transcript = await readFile(agent.transcriptPath, "utf8");
        if (transcript.length > 0) {
          output = transcript;
        }
      } catch {
        output = agent.resultText ?? "";
      }
      const lines = output.split("\n");
      const tail = input.tail_lines ?? lines.length;
      const isolation = agent.isolated
        ? [
            `worktree: ${agent.cwd ?? "-"}`,
            `branch: ${agent.worktreeBranch ?? "-"}`,
          ]
        : [];
      return [
        `agent: ${agent.id}${agent.name ? ` (${agent.name})` : ""}`,
        `status: ${agent.status}`,
        ...isolation,
        lines.slice(-tail).join("\n"),
      ].join("\n");
    }
    const task = getTask(input.task_id);
    if (!task) {
      return `Unknown task: ${input.task_id}`;
    }
    let output = "";
    try {
      output = await readFile(task.outputPath, "utf8");
    } catch {
      output = "";
    }
    const lines = output.split("\n");
    const tail = input.tail_lines ?? lines.length;
    return [
      `task: ${task.id}`,
      `status: ${task.status}`,
      `exit: ${task.exitCode ?? "-"}`,
      lines.slice(-tail).join("\n"),
    ].join("\n");
  },
});
