import type { AgentDefinition } from "../services/agents/loadAgents.js";
import type { SkillDefinition } from "../skills/skillSchema.js";

const builtInCommands = [
  "/exit",
  "/clear",
  "/model",
  "/tokens",
  "/permissions",
  "/resume",
  "/memory",
  "/compact",
  "/mcp",
  "/help",
  "/doctor",
  "/config",
  "/plan",
  "/plan-approve",
  "/tasks",
  "/agents",
  "/diff",
  "/context",
  "/rewind",
  "/init",
  "/export",
  "/branch",
  "/coordinator",
  "/commit",
  "/review",
];

export const formatHelp = (
  skills: SkillDefinition[],
  agents: AgentDefinition[] = [],
): string => {
  const skillLines = skills.map((skill) => `/${skill.commandName} - ${skill.description}`);
  const agentLines = agents.map((agent) => `${agent.name} - ${agent.description}`);
  return [
    "Built-in commands:",
    ...builtInCommands.map((command) => `- ${command}`),
    "",
    "Skills:",
    ...(skillLines.length > 0 ? skillLines.map((line) => `- ${line}`) : ["- none loaded"]),
    "",
    "Agents:",
    ...(agentLines.length > 0 ? agentLines.map((line) => `- ${line}`) : ["- none loaded"]),
  ].join("\n");
};
