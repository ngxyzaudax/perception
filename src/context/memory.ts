import { readFile } from "node:fs/promises";
import { globalMemoryPath, projectMemoryPath } from "../services/sessions/sessionPaths.js";

type MemorySection = {
  label: string;
  content: string;
};

export const loadMemory = async (): Promise<string | null> => {
  const sections = await Promise.all([
    readMemoryFile(globalMemoryPath(), "Global memory"),
    readMemoryFile(projectMemoryPath(), "Project memory"),
  ]);
  const present = sections.filter((section): section is MemorySection => section !== null);
  if (present.length === 0) {
    return null;
  }
  return present.map((section) => `${section.label}:\n${section.content}`).join("\n\n");
};

const readMemoryFile = async (
  path: string,
  label: string,
): Promise<MemorySection | null> => {
  try {
    const content = (await readFile(path, "utf8")).trim();
    if (content.length === 0) {
      return null;
    }
    return { label, content };
  } catch {
    return null;
  }
};
