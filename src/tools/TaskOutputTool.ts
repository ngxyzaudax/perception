import { readFile } from "node:fs/promises";
import { z } from "zod";
import { buildTool } from "../Tool.js";
import { getAgentTask, getAgentTaskByIdOrName } from "../state/agentTasks.js";
import { getCursorAgentTaskByIdOrAgentId } from "../state/cursorAgentTasks.js";
import { getTask } from "../state/backgroundTasks.js";

const inputSchema = z.object({
  task_id: z.string().describe("Background task or agent id"),
  tail_lines: z.number().int().positive().optional().describe("Number of lines to return"),
});

const DEFAULT_TAIL_LINES = 200;
const MAX_OUTPUT_CHARS = 50000;

export const TaskOutputTool = buildTool({
  name: "TaskOutput",
  description: "Read output from a background shell task or agent transcript",
  inputSchema,
  isReadOnly: () => true,
  summarize: (input) => input.task_id,
  call: async (input) => {
    const cursor = getCursorAgentTaskByIdOrAgentId(input.task_id);
    if (cursor) {
      const output = cursor.resultText ?? cursor.errorText ?? "";
      const lines = output.split("\n");
      const tail = Math.min(input.tail_lines ?? DEFAULT_TAIL_LINES, DEFAULT_TAIL_LINES);
      return capOutput(
        [
          `cursor-agent: ${cursor.agentId} (task ${cursor.id})`,
          `runtime: ${cursor.runtime}`,
          `status: ${cursor.status}`,
          cursor.cwd ? `cwd: ${cursor.cwd}` : "",
          cursor.isolated && cursor.worktreeBranch ? `branch: ${cursor.worktreeBranch}` : "",
          cursor.repoUrl ? `repo: ${cursor.repoUrl}` : "",
          cursor.runId ? `run: ${cursor.runId}` : "",
          lines.slice(-tail).join("\n"),
        ]
          .filter(Boolean)
          .join("\n"),
      );
    }
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
      const tail = Math.min(input.tail_lines ?? DEFAULT_TAIL_LINES, DEFAULT_TAIL_LINES);
      const isolation = agent.isolated
        ? [
            `worktree: ${agent.cwd ?? "-"}`,
            `branch: ${agent.worktreeBranch ?? "-"}`,
          ]
        : [];
      return capOutput(
        [
          `agent: ${agent.id}${agent.name ? ` (${agent.name})` : ""}`,
          `status: ${agent.status}`,
          ...isolation,
          lines.slice(-tail).join("\n"),
        ].join("\n"),
      );
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
    const tail = Math.min(input.tail_lines ?? DEFAULT_TAIL_LINES, DEFAULT_TAIL_LINES);
    return capOutput(
      [
        `task: ${task.id}`,
        `status: ${task.status}`,
        `exit: ${task.exitCode ?? "-"}`,
        lines.slice(-tail).join("\n"),
      ].join("\n"),
    );
  },
});

const capOutput = (output: string): string =>
  output.length <= MAX_OUTPUT_CHARS
    ? output
    : `${output.slice(0, MAX_OUTPUT_CHARS)}\n...[truncated ${output.length} chars]`;
