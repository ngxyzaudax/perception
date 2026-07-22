import type { Settings } from "../../schemas/settings.js";
import { loadSkills } from "../../skills/loadSkills.js";
import { createLlmClient } from "../llm/client.js";
import { projectMcpConfigPath } from "../mcp/mcpConfig.js";
import { formatMcpStatus, getMcpStatuses } from "../mcp/mcpManager.js";
import { perceptionHome } from "../sessions/sessionPaths.js";
import { getCwd } from "../../utils/cwd.js";
import { runShell } from "../../utils/shell.js";

export const runDoctor = async (settings: Settings): Promise<string> => {
  const lines = [
    await checkVllm(settings),
    await checkRipgrep(),
    await checkSkills(),
    checkMcp(),
    checkPaths(settings),
  ];
  return lines.join("\n");
};

const checkVllm = async (settings: Settings): Promise<string> => {
  try {
    const client = createLlmClient(settings);
    const models = await client.models.list();
    const count = models.data.length;
    return `vLLM: ok (${settings.baseUrl}, ${count} model(s))`;
  } catch (error) {
    const message = error instanceof Error ? error.message : "connection failed";
    return `vLLM: error (${message})`;
  }
};

const checkRipgrep = async (): Promise<string> => {
  const result = await runShell("command -v rg >/dev/null && echo ok", 5000);
  return result.exitCode === 0 ? "ripgrep: ok" : "ripgrep: missing (Grep tool will fail)";
};

const checkSkills = async (): Promise<string> => {
  const skills = await loadSkills();
  return skills.length > 0 ? `skills: ${skills.length} loaded` : "skills: none configured";
};

const checkMcp = (): string => {
  const statuses = getMcpStatuses();
  return statuses.length > 0 ? `mcp: ${formatMcpStatus(statuses)}` : "mcp: no servers configured";
};

const checkPaths = (settings: Settings): string =>
  [
    `cwd: ${getCwd()}`,
    `config: ${perceptionHome()}/settings.json`,
    `memory: ${perceptionHome()}/memory.md`,
    `skills: ${perceptionHome()}/skills/`,
    `project: ${projectMcpConfigPath()}`,
    `model: ${settings.model ?? "auto"}`,
  ].join("\n");
