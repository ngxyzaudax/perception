import { z } from "zod";
import { buildTool } from "../Tool.js";
import { runBackgroundShell } from "../services/tasks/runBackgroundShell.js";
import { runShell } from "../utils/shell.js";

const inputSchema = z.object({
  command: z.string().describe("Shell command to execute"),
  description: z
    .string()
    .optional()
    .describe("Short description of what the command does"),
  run_in_background: z
    .boolean()
    .optional()
    .describe("Run the command in the background and return a task id"),
});

export const BashTool = buildTool({
  name: "Bash",
  description: "Execute a bash shell command in the working directory",
  inputSchema,
  isReadOnly: () => false,
  summarize: (input) => input.command,
  call: async (input, context) => {
    if (input.run_in_background) {
      const task = await runBackgroundShell(input.command, context.cwd);
      return [
        `Background task started: ${task.taskId}`,
        `pid: ${task.pid}`,
        `output: ${task.outputPath}`,
      ].join("\n");
    }
    const result = await runShell(input.command, 120000, context.abortSignal, context.cwd);
    const sections = [
      result.stdout.trim(),
      result.stderr.trim() ? `stderr:\n${result.stderr.trim()}` : "",
      `exit code: ${result.exitCode}`,
    ].filter(Boolean);
    return sections.join("\n\n");
  },
});
