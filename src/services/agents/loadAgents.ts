import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseFrontmatter } from "../../utils/frontmatter.js";
import { perceptionHome } from "../sessions/sessionPaths.js";
import { getCwd } from "../../utils/cwd.js";
import { builtInAgents } from "./builtInAgents.js";
import { parsePositiveTurnLimit } from "../../query/turnLimits.js";

export type AgentDefinition = {
  name: string;
  description: string;
  systemPrompt: string;
  tools: string[];
  model?: string;
  maxTurns?: number;
  filePath: string;
};

export const loadAgents = async (): Promise<AgentDefinition[]> => {
  const global = await loadAgentsFromDir(join(perceptionHome(), "agents"));
  const project = await loadAgentsFromDir(join(getCwd(), ".perception", "agents"));
  const merged = new Map<string, AgentDefinition>();
  for (const agent of [...builtInAgents(), ...global, ...project]) {
    merged.set(agent.name.toLowerCase(), agent);
  }
  return [...merged.values()].sort((left, right) => left.name.localeCompare(right.name));
};

export const getAgentByName = (
  agents: AgentDefinition[],
  name: string,
): AgentDefinition | undefined =>
  agents.find((agent) => agent.name.toLowerCase() === name.toLowerCase());

export const formatAgentList = (agents: AgentDefinition[]): string => {
  if (agents.length === 0) {
    return "no custom agents configured";
  }
  return agents.map((agent) => `${agent.name} - ${agent.description}`).join("\n");
};

const loadAgentsFromDir = async (directory: string): Promise<AgentDefinition[]> => {
  let entries: string[];
  try {
    entries = await readdir(directory);
  } catch {
    return [];
  }
  const agents = await Promise.all(
    entries
      .filter((entry) => entry.endsWith(".md"))
      .map(async (entry) => parseAgentFile(join(directory, entry))),
  );
  return agents.filter((agent): agent is AgentDefinition => agent !== null);
};

const parseAgentFile = async (filePath: string): Promise<AgentDefinition | null> => {
  try {
    const content = await readFile(filePath, "utf8");
    const parsed = parseFrontmatter(content);
    const name = parsed.frontmatter.name;
    if (!name) {
      return null;
    }
    const tools = parsed.frontmatter.tools
      ? parsed.frontmatter.tools.split(",").map((tool) => tool.trim()).filter(Boolean)
      : [];
    return {
      name,
      description: parsed.frontmatter.description ?? name,
      systemPrompt: parsed.body,
      tools,
      model: parsed.frontmatter.model,
      maxTurns: parsePositiveTurnLimit(parsed.frontmatter.maxTurns),
      filePath,
    };
  } catch {
    return null;
  }
};
