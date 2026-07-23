import { open, stat } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import { buildTool } from "../Tool.js";
import { recordFileRead, resolveFileScope } from "../state/readFileState.js";
import { expandPath } from "../utils/path.js";

const DEFAULT_LINE_LIMIT = 2000;
const MAX_LINE_CHARS = 2000;
const MAX_FILE_BYTES = 10 * 1024 * 1024;

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
  isConcurrencySafe: () => true,
  summarize: (input) => input.file_path,
  call: async (input, context) => {
    const path = expandPath(input.file_path, context.cwd);
    const scope = resolveFileScope(context.runtime?.agentScope);
    const fileStat = await stat(path);
    if (fileStat.size > MAX_FILE_BYTES) {
      return `File too large to read (${fileStat.size} bytes). Use offset/limit with a smaller file or Grep.`;
    }
    if (await isBinaryFile(path)) {
      return `Refusing to read binary file: ${input.file_path}`;
    }
    recordFileRead(path, fileStat.mtimeMs, scope);
    const content = await readFile(path, "utf8");
    const lines = content.split("\n");
    const offset = Math.max(1, input.offset ?? 1);
    const limit = Math.min(input.limit ?? DEFAULT_LINE_LIMIT, DEFAULT_LINE_LIMIT);
    const slice = lines.slice(offset - 1, offset - 1 + limit);
    const rendered = slice
      .map((line, index) => {
        const clipped = line.length > MAX_LINE_CHARS ? `${line.slice(0, MAX_LINE_CHARS)}…` : line;
        return `${String(offset + index).padStart(6, " ")}\t${clipped}`;
      })
      .join("\n");
    if (offset - 1 + limit < lines.length && !input.limit) {
      return `${rendered}\n\n[truncated: showing ${limit} of ${lines.length} lines; pass offset/limit to continue]`;
    }
    return rendered;
  },
});

const isBinaryFile = async (path: string): Promise<boolean> => {
  const handle = await open(path, "r");
  try {
    const buffer = Buffer.alloc(8192);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    return buffer.subarray(0, bytesRead).includes(0);
  } finally {
    await handle.close();
  }
};
