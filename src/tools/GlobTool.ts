import { z } from "zod";
import { buildTool } from "../Tool.js";
import { findFiles } from "../utils/glob.js";

const inputSchema = z.object({
  pattern: z.string().describe("Glob pattern such as **/*.ts"),
  path: z.string().optional().describe("Directory to search in"),
});

export const GlobTool = buildTool({
  name: "Glob",
  description: "Find files matching a glob pattern",
  inputSchema,
  isReadOnly: () => true,
  summarize: (input) => input.pattern,
  call: async (input, context) => {
    const matches = await findFiles({
      pattern: input.pattern,
      cwd: input.path,
      baseCwd: context.cwd,
    });
    if (matches.length === 0) {
      return "No files found";
    }
    return matches.join("\n");
  },
});
