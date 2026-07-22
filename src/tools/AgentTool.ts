import { z } from "zod";
import { buildTool } from "../Tool.js";
import {
  getAgentByName,
  loadAgents,
  type AgentDefinition,
} from "../services/agents/loadAgents.js";
import { startAgent, type AgentIsolation } from "../services/agents/agentLifecycle.js";

const inputSchema = z.object({
  description: z.string().describe("Short label for what the sub-agent should do"),
  prompt: z.string().describe("Detailed task prompt for the sub-agent"),
  agent_type: z
    .string()
    .optional()
    .describe(
      "Agent type: built-in (explore, plan, general-purpose, verification) or a custom agent from .perception/agents",
    ),
  run_in_background: z
    .boolean()
    .optional()
    .describe("Run the agent in the background and notify on completion"),
  name: z
    .string()
    .optional()
    .describe("Name for the spawned agent, addressable via SendMessage"),
  team_name: z.string().optional().describe("Team name for the spawned agent"),
  isolation: z
    .enum(["worktree", "none"])
    .optional()
    .describe("Worktree isolation for background agents; defaults to worktree"),
});

let cachedAgents: AgentDefinition[] = [];

export const refreshAgents = async (): Promise<AgentDefinition[]> => {
  cachedAgents = await loadAgents();
  return cachedAgents;
};

export const getLoadedAgents = (): AgentDefinition[] => cachedAgents;

export const AgentTool = buildTool({
  name: "Agent",
  description:
    "Spawn a sub-agent to handle a complex task. Built-in types: explore (read-only search), plan (read-only planning), general-purpose (full toolset), verification (runs tests, returns a verdict). Background agents run in isolated git worktrees on dedicated branches. Foreground sub-agents share the main tree. Sub-agents cannot spawn further agents.",
  inputSchema,
  isReadOnly: () => true,
  summarize: (input) => input.description,
  call: async (input, context) => {
    if (!context.runtime) {
      return "Agent tool runtime unavailable";
    }
    const agent = input.agent_type ? getAgentByName(cachedAgents, input.agent_type) : undefined;
    if (input.agent_type && !agent) {
      return `Unknown agent: ${input.agent_type}`;
    }
    const runInBackground =
      input.run_in_background ?? context.runtime.coordinatorMode ?? false;
    return startAgent({
      description: input.description,
      prompt: input.prompt,
      runtime: context.runtime,
      signal: context.abortSignal,
      agent,
      runInBackground,
      name: input.name,
      teamName: input.team_name,
      isolation: input.isolation as AgentIsolation | undefined,
    });
  },
});
