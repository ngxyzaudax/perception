import { readFile, stat, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { z } from "zod";
import { buildTool } from "../Tool.js";
import { isPlanFilePath } from "../services/plans/planFiles.js";
import {
  checkFileFreshness,
  resolveFileScope,
  touchFileRead,
} from "../state/readFileState.js";
import { expandPath } from "../utils/path.js";

const inputSchema = z.object({
  file_path: z.string().describe("Absolute or relative path to the file"),
  content: z.string().describe("Full file content to write"),
});

export const FileWriteTool = buildTool({
  name: "Write",
  description: "Create or overwrite a file",
  inputSchema,
  isReadOnly: () => false,
  summarize: (input) => input.file_path,
  checkPermissions: async (input, context) => {
    const path = expandPath(input.file_path, context.cwd);
    const sessionId = context.runtime?.sessionId;
    if (sessionId && isPlanFilePath(path, sessionId)) {
      return { granted: true };
    }
    return null;
  },
  getPreview: async (input, context) => {
    const path = expandPath(input.file_path, context.cwd);
    let oldContent = "";
    try {
      oldContent = await readFile(path, "utf8");
    } catch {
      oldContent = "";
    }
    return { oldContent, newContent: input.content };
  },
  call: async (input, context) => {
    const path = expandPath(input.file_path, context.cwd);
    const scope = resolveFileScope(context.runtime?.agentScope);
    let exists = true;
    try {
      await stat(path);
    } catch {
      exists = false;
    }
    if (exists) {
      const freshness = await checkFileFreshness(path, scope);
      if (freshness) {
        return freshness;
      }
    }
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, input.content, "utf8");
    await touchFileRead(path, scope);
    return `Wrote ${input.file_path}`;
  },
});
