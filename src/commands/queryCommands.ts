import { buildCommitPrompt, buildReviewPrompt } from "../screens/promptCommands.js";
import type { Command } from "./types.js";

export const queryCommands: Command[] = [
  {
    name: "/commit",
    description: "Create a git commit from current changes",
    execute: async (context) => ({
      type: "query",
      messages: [
        ...context.messages,
        { role: "user", content: await buildCommitPrompt() },
      ],
    }),
  },
  {
    name: "/review",
    description: "Review current code changes",
    execute: async (context) => ({
      type: "query",
      messages: [
        ...context.messages,
        { role: "user", content: await buildReviewPrompt() },
      ],
    }),
  },
];
