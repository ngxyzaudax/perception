import { stat } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import { buildTool } from "../Tool.js";
import { recordFileRead, resolveFileScope } from "../state/readFileState.js";
import { expandPath } from "../utils/path.js";

const inputSchema = z.object({
  file_path: z.string().describe("Absolute or relative path to the file"),
  offset: z.number().int().positive().optional().describe("1-based start line"),
  limit: z.number().int().positive().optional().describe("Maximum lines to read"),
});

export const FileReadTool = buildTool({
  name: "Read",
  description: "Read a text file from disk",
  inputSchema,
  isReadOnly: () => true,
  summarize: (input) => input.file_path,
  call: async (input, context) => {
    const path = expandPath(input.file_path, context.cwd);
    const scope = resolveFileScope(context.runtime?.agentScope);
    const fileStat = await stat(path);
    recordFileRead(path, fileStat.mtimeMs, scope);
    const content = await readFile(path, "utf8");
    const lines = content.split("\n");
    const offset = Math.max(1, input.offset ?? 1);
    const limit = input.limit ?? lines.length;
    const slice = lines.slice(offset - 1, offset - 1 + limit);
    return slice
      .map((line, index) => `${String(offset + index).padStart(6, " ")}\t${line}`)
      .join("\n");
  },
});
