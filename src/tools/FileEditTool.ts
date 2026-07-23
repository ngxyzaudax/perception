import { readFile, writeFile, stat } from "node:fs/promises";
import { z } from "zod";
import { buildTool } from "../Tool.js";
import { isPlanFilePath } from "../services/plans/planFiles.js";
import {
  checkFileFreshness,
  resolveFileScope,
  touchFileRead,
} from "../state/readFileState.js";
import { expandPath } from "../utils/path.js";

const MAX_EDIT_FILE_BYTES = 10 * 1024 * 1024;

const inputSchema = z.object({
  file_path: z.string().describe("Absolute or relative path to the file"),
  old_string: z.string().describe("Exact text to replace"),
  new_string: z.string().describe("Replacement text"),
  replace_all: z.boolean().optional().describe("Replace all occurrences"),
});

export const FileEditTool = buildTool({
  name: "Edit",
  description: "Replace text in an existing file",
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
    const content = await readFile(path, "utf8");
    const updated = input.replace_all
      ? content.split(input.old_string).join(input.new_string)
      : content.replace(input.old_string, input.new_string);
    return { oldContent: content, newContent: updated };
  },
  call: async (input, context) => {
    if (input.old_string === input.new_string) {
      return "No changes: old_string and new_string are identical.";
    }
    const path = expandPath(input.file_path, context.cwd);
    const fileStat = await stat(path);
    if (fileStat.size > MAX_EDIT_FILE_BYTES) {
      return `File too large to edit (${fileStat.size} bytes).`;
    }
    const scope = resolveFileScope(context.runtime?.agentScope);
    const freshness = await checkFileFreshness(path, scope);
    if (freshness) {
      return freshness;
    }
    const content = await readFile(path, "utf8");
    const occurrences = countOccurrences(content, input.old_string);
    if (occurrences === 0) {
      return `No match found in ${input.file_path}`;
    }
    if (!input.replace_all && occurrences > 1) {
      return `Found ${occurrences} matches. Set replace_all to true or use a unique old_string.`;
    }
    const updated = input.replace_all
      ? content.split(input.old_string).join(input.new_string)
      : content.replace(input.old_string, input.new_string);
    await writeFile(path, updated, "utf8");
    await touchFileRead(path, scope);
    return `Updated ${input.file_path}`;
  },
});

const countOccurrences = (content: string, needle: string): number =>
  content.split(needle).length - 1;
