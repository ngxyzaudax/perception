import { readFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";

export type FileMentionResult = {
  prompt: string;
  attachments: string[];
};

const mentionPattern = /@([^\s@]+)/g;
const maxLines = 2000;

export const expandFileMentions = async (
  input: string,
  cwd: string,
): Promise<FileMentionResult> => {
  const matches = [...input.matchAll(mentionPattern)];
  if (matches.length === 0) {
    return { prompt: input, attachments: [] };
  }
  const attachments: string[] = [];
  for (const match of matches) {
    const token = match[1];
    if (!token) {
      continue;
    }
    const path = isAbsolute(token) ? token : resolve(cwd, token);
    const attachment = await readMentionFile(path);
    if (attachment) {
      attachments.push(attachment);
    }
  }
  return { prompt: input, attachments };
};

const readMentionFile = async (path: string): Promise<string | null> => {
  try {
    const content = await readFile(path, "utf8");
    const lines = content.split("\n").slice(0, maxLines);
    return `Attached file ${path}:\n${lines.join("\n")}`;
  } catch {
    return null;
  }
};
