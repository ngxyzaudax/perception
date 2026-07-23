import { z } from "zod";
import { buildTool } from "../Tool.js";
import { runBackgroundShell } from "../services/tasks/runBackgroundShell.js";
import { runShell } from "../utils/shell.js";

const DEFAULT_TIMEOUT_MS = 120_000;
const MAX_TIMEOUT_MS = 600_000;

const inputSchema = z.object({
  command: z.string().describe("Shell command to execute"),
  description: z
    .string()
    .optional()
    .describe("Short description of what the command does"),
  timeout: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Timeout in milliseconds (default 120000, max 600000)"),
  run_in_background: z
    .boolean()
    .optional()
    .describe("Run the command in the background and return a task id"),
});

export const isDangerousBashCommand = (command: string): boolean => {
  const trimmed = command.trim();
  if (/\brm\s+-[a-zA-Z]*f[a-zA-Z]*\s+\//.test(trimmed)) {
    return true;
  }
  if (/\bcurl\b[\s\S]*\|\s*(?:ba)?sh\b/.test(trimmed)) {
    return true;
  }
  if (/\bwget\b[\s\S]*\|\s*(?:ba)?sh\b/.test(trimmed)) {
    return true;
  }
  if (/~\/\.perception\b/.test(trimmed) || /\$HOME\/\.perception\b/.test(trimmed)) {
    return true;
  }
  return false;
};

export const BashTool = buildTool({
  name: "Bash",
  description: "Execute a bash shell command in the working directory",
  inputSchema,
  isReadOnly: () => false,
  needsExplicitPermission: (input) => isDangerousBashCommand(input.command),
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
    const timeoutMs = Math.min(input.timeout ?? DEFAULT_TIMEOUT_MS, MAX_TIMEOUT_MS);
    const result = await runShell(input.command, timeoutMs, context.abortSignal, context.cwd);
    const sections = [
      result.stdout.trim(),
      result.stderr.trim() ? `stderr:\n${result.stderr.trim()}` : "",
      `exit code: ${result.exitCode}`,
    ].filter(Boolean);
    return sections.join("\n\n");
  },
});
