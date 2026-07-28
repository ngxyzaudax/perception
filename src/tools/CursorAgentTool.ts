import { z } from "zod";
import { buildTool } from "../Tool.js";
import {
  continueCursorAgent,
  missingCursorApiKeyMessage,
  requireCursorApiKey,
  startCursorAgent,
} from "../services/cursor/cursorAgentService.js";
import type { AgentIsolation } from "../services/agents/agentLifecycle.js";

const DEFAULT_MODEL = "composer-2.5";

const inputSchema = z.object({
  description: z.string().describe("Short label for what the Cursor agent should do"),
  prompt: z.string().describe("Detailed task prompt for the Cursor agent"),
  runtime: z
    .enum(["local", "cloud"])
    .optional()
    .describe("Local runs against cwd; cloud clones a remote repo in a Cursor VM"),
  model: z.string().optional().describe("Cursor model id, defaults to composer-2.5"),
  run_in_background: z
    .boolean()
    .optional()
    .describe("Return immediately and notify when the Cursor agent completes"),
  cwd: z.string().optional().describe("Working directory for local Cursor agents"),
  repo_url: z.string().url().optional().describe("Remote repository URL for cloud agents"),
  starting_ref: z.string().optional().describe("Git ref to clone for cloud agents"),
  auto_create_pr: z
    .boolean()
    .optional()
    .describe("Open a pull request when a cloud Cursor agent finishes"),
  isolation: z
    .enum(["worktree", "none"])
    .optional()
    .describe("Worktree isolation for local Cursor agents; defaults to worktree for background runs"),
  agent_id: z
    .string()
    .optional()
    .describe("Existing Cursor agent id or task id for a follow-up prompt"),
});

export const CursorAgentTool = buildTool({
  name: "CursorAgent",
  description:
    "Hand off coding work to a durable Cursor agent via the Cursor SDK. Local agents run against a directory on this machine. Cloud agents clone a connected remote repository in a Cursor VM. Background completion arrives automatically as a task notification. Use TaskOutput only for explicit status inspection and TaskStop to cancel.",
  inputSchema,
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  summarize: (input) => input.description,
  call: async (input, context) => {
    if (!context.runtime) {
      return "CursorAgent tool runtime unavailable";
    }
    const apiKey = requireCursorApiKey(context.runtime.settings);
    if (!apiKey) {
      return missingCursorApiKeyMessage();
    }
    const runtime = input.runtime ?? "local";
    const cwd = input.cwd ?? context.cwd;
    if (runtime === "cloud" && !input.repo_url) {
      return "Cloud Cursor agents require repo_url pointing to a repository connected in Cursor.";
    }
    const runInBackground = input.run_in_background ?? false;
    const model = input.model ?? DEFAULT_MODEL;
    if (input.agent_id) {
      return continueCursorAgent({
        agentId: input.agent_id,
        prompt: input.prompt,
        apiKey,
        runtime,
        model,
        cwd,
        runInBackground,
        signal: context.abortSignal,
      });
    }
    return startCursorAgent({
      description: input.description,
      prompt: input.prompt,
      apiKey,
      runtime,
      model,
      cwd,
      repoUrl: input.repo_url,
      startingRef: input.starting_ref,
      autoCreatePr: input.auto_create_pr,
      runInBackground,
      isolation: input.isolation as AgentIsolation | undefined,
      signal: context.abortSignal,
    });
  },
});
