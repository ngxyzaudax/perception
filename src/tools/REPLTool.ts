import { z } from "zod";
import { buildTool } from "../Tool.js";
import { resetVmSession, runVmCode } from "../services/repl/vmSession.js";

const inputSchema = z.object({
  code: z.string().describe("JavaScript code to evaluate"),
  reset: z.boolean().optional().describe("Reset the persistent REPL session"),
  timeout_ms: z.number().int().positive().optional().describe("Execution timeout in ms"),
});

export const REPLTool = buildTool({
  name: "REPL",
  description: "Run JavaScript in a persistent sandbox with captured console output",
  inputSchema,
  isReadOnly: () => false,
  summarize: () => "repl",
  call: async (input, context) => {
    const sessionId = context.runtime?.sessionId ?? "default";
    if (input.reset) {
      resetVmSession(sessionId);
    }
    const timeoutMs = Math.min(input.timeout_ms ?? 30000, 120000);
    try {
      const result = runVmCode(sessionId, input.code, timeoutMs);
      return [
        result.stdout ? `stdout:\n${result.stdout}` : "",
        result.stderr ? `stderr:\n${result.stderr}` : "",
        `result: ${formatResult(result.result)}`,
      ]
        .filter(Boolean)
        .join("\n\n");
    } catch (error) {
      const message = error instanceof Error ? error.message : "repl execution failed";
      return message;
    }
  },
});

const formatResult = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};
