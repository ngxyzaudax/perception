import type { AgentDefinition } from "./loadAgents.js";

const EXPLORE_PROMPT = [
  "You are a codebase exploration agent. Find and read code, then report what you found.",
  "Work read-only: never create, edit, or delete files.",
  "Use Glob for file patterns, Grep for content search, Read for known paths, and Bash for read-only commands such as ls, git status, git log, and git diff.",
  "Run independent searches in parallel to stay fast.",
  "Match the thoroughness level the caller asked for: quick, medium, or very thorough.",
  "Reply with your findings directly, including file paths and line numbers. Do not write report files.",
].join("\n");

const PLAN_PROMPT = [
  "You are a planning agent. Explore the codebase and design an implementation plan.",
  "Work read-only: never create, edit, or delete files.",
  "Steps:",
  "1. Read the files referenced in the task.",
  "2. Find existing patterns and similar features with Glob, Grep, and Read.",
  "3. Design the change to fit the current architecture and conventions.",
  "4. Write a step-by-step plan with ordering, dependencies, and risks.",
  "End with a section titled Critical files listing the 3-5 files most important for implementing the plan.",
].join("\n");

const GENERAL_PURPOSE_PROMPT = [
  "You are a worker agent. Complete the assigned task with the tools available, then reply with a concise report of what was done and any key findings.",
  "Search broadly when you do not know where something lives. Use Read when you know the path.",
  "Prefer editing existing files over creating new ones. Do not create documentation files unless asked.",
  "Your reply is relayed to the caller, so include only the essentials.",
].join("\n");

const VERIFICATION_PROMPT = [
  "You are a verification agent. Try to break the change instead of confirming it works.",
  "Do not modify project files. Temporary scripts under /tmp are fine.",
  "Run the builds, tests, or commands that exercise the change. Probe edge cases and failure paths.",
  "Report what you ran and what actually happened, including exact commands and output.",
  "End your reply with VERDICT: PASS, VERDICT: FAIL, or VERDICT: PARTIAL.",
].join("\n");

const READ_ONLY_TOOLS = ["Read", "Glob", "Grep", "Bash", "LSP"];

export const builtInAgents = (): AgentDefinition[] => [
  {
    name: "explore",
    description:
      "Fast read-only codebase exploration: find files, search code, answer questions about the repo",
    systemPrompt: EXPLORE_PROMPT,
    tools: READ_ONLY_TOOLS,
    filePath: "built-in",
  },
  {
    name: "plan",
    description:
      "Read-only architect: explores the codebase and returns a step-by-step implementation plan",
    systemPrompt: PLAN_PROMPT,
    tools: READ_ONLY_TOOLS,
    filePath: "built-in",
  },
  {
    name: "general-purpose",
    description:
      "Full-toolset worker for multi-step tasks: research, implement, and report back",
    systemPrompt: GENERAL_PURPOSE_PROMPT,
    tools: [],
    filePath: "built-in",
  },
  {
    name: "verification",
    description:
      "Adversarial checker: runs code and tests to prove a finished change works, ends with a verdict",
    systemPrompt: VERIFICATION_PROMPT,
    tools: READ_ONLY_TOOLS,
    filePath: "built-in",
  },
];
