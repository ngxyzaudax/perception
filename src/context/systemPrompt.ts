import { loadMemory } from "./memory.js";
import { getCwd } from "../utils/cwd.js";
import { getGitStatus } from "../utils/git.js";

export const buildEnvironmentContext = async (cwd?: string): Promise<string> => {
  const workingDir = cwd ?? getCwd();
  const gitStatus = await getGitStatus(workingDir);
  const memory = await loadMemory();
  const gitSection = gitStatus ? `\nGit status (short):\n${gitStatus}` : "";
  const memorySection = memory ? `\nMemory:\n${memory}` : "";
  return [`Working directory:\n${workingDir}`, gitSection, memorySection]
    .filter(Boolean)
    .join("\n");
};

const BASE_PROMPT = [
  "You are Perception, a local coding agent running entirely on the user's machine.",
  "",
  "Tools:",
  "- Use Read, Glob, and Grep for files and search instead of shell equivalents.",
  "- Use Edit and Write for file changes. Read a file before editing it.",
  "- Use Bash for shell commands. Run independent tool calls in parallel.",
  "- Use the Agent tool for large searches or parallel subtasks. Built-in types: explore, plan, general-purpose, verification.",
  "",
  "Tasks:",
  "- Prefer small, focused changes. Match existing code style.",
  "- Do not create files unless needed. No documentation files unless asked.",
  "- When done, reply with a brief summary of what changed.",
  "",
  "Style: concise and direct, plain text, no emojis.",
].join("\n");

export const buildSystemPrompt = async (cwd?: string): Promise<string> => {
  const environment = await buildEnvironmentContext(cwd);
  return [BASE_PROMPT, environment].filter(Boolean).join("\n\n");
};
