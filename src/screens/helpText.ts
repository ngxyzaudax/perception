import type { CommandCompletion } from "../commands/types.js";
import type { AgentDefinition } from "../services/agents/loadAgents.js";

const formatCommandLine = (command: CommandCompletion): string =>
  `- ${command.name} - ${command.description}`;

const formatAgentLine = (agent: AgentDefinition): string =>
  `- ${agent.name} - ${agent.description}`;

export const formatHelp = (
  commands: CommandCompletion[],
  agents: AgentDefinition[] = [],
): string => {
  const agentLines = agents.map(formatAgentLine);
  return [
    "Commands:",
    ...commands.map(formatCommandLine),
    "",
    "Agents:",
    ...(agentLines.length > 0 ? agentLines : ["- none loaded"]),
  ].join("\n");
};
