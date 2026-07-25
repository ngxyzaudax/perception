import type { AgentOptions } from "@cursor/sdk";
import type { CursorAgentRuntime } from "../../state/cursorAgentTasks.js";

export type CursorAgentCreateOptions = {
  apiKey: string;
  model: string;
  runtime: CursorAgentRuntime;
  cwd: string;
  repoUrl?: string;
  startingRef?: string;
  autoCreatePr?: boolean;
  name?: string;
};

export const buildAgentOptions = (input: CursorAgentCreateOptions): AgentOptions => {
  const model = { id: input.model };
  if (input.runtime === "cloud") {
    return {
      apiKey: input.apiKey,
      model,
      name: input.name,
      cloud: {
        repos: [{ url: input.repoUrl!, startingRef: input.startingRef }],
        autoCreatePR: input.autoCreatePr ?? false,
      },
    };
  }
  return {
    apiKey: input.apiKey,
    model,
    name: input.name,
    local: localAgentOptions(input.cwd),
  };
};

export const buildResumeOptions = (input: {
  apiKey: string;
  model?: string;
  runtime: CursorAgentRuntime;
  cwd: string;
}): Partial<AgentOptions> => ({
  apiKey: input.apiKey,
  model: input.model ? { id: input.model } : undefined,
  local: input.runtime === "local" ? localAgentOptions(input.cwd) : undefined,
});

const localAgentOptions = (cwd: string): NonNullable<AgentOptions["local"]> => ({
  cwd,
  sandboxOptions: { enabled: true },
});
