import type { ToolRuntime } from "../../Tool.js";
import type { AgentDefinition } from "./loadAgents.js";
import { runAgentTurn } from "./runAgentTurn.js";

export type SubAgentInput = {
  description: string;
  prompt: string;
  runtime: ToolRuntime;
  signal: AbortSignal;
  agent?: AgentDefinition;
  maxTurns?: number;
};

export const runSubAgent = async (input: SubAgentInput): Promise<string> => {
  const turn = await runAgentTurn({
    description: input.description,
    messages: [{ role: "user", content: input.prompt }],
    runtime: input.runtime,
    signal: input.signal,
    agent: input.agent,
    maxTurns: input.maxTurns,
  });
  return turn.text;
};
