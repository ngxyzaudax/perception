import { z } from "zod";
import { buildTool } from "../Tool.js";
import { searchContent } from "../utils/ripgrep.js";

const inputSchema = z.object({
  pattern: z.string().describe("Regular expression pattern"),
  path: z.string().optional().describe("File or directory to search"),
  glob: z.string().optional().describe("Glob filter such as *.ts"),
  output_mode: z
    .enum(["content", "files_with_matches", "count"])
    .optional()
    .describe("Output mode"),
  head_limit: z.number().int().nonnegative().optional().describe("Limit results"),
  "-i": z.boolean().optional().describe("Case insensitive search"),
});

export const GrepTool = buildTool({
  name: "Grep",
  description: "Search file contents with ripgrep",
  inputSchema,
  isReadOnly: () => true,
  summarize: (input) => input.pattern,
  call: async (input, context) => {
    const output = await searchContent({
      pattern: input.pattern,
      path: input.path,
      glob: input.glob,
      outputMode: input.output_mode,
      headLimit: input.head_limit,
      caseInsensitive: input["-i"],
      cwd: context.cwd,
    });
    return output.length > 0 ? output : "No matches found";
  },
});
