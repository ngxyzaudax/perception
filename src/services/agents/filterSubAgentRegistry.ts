import type { ToolRegistry } from "../../Tool.js";

const EXCLUDED_FROM_SUBAGENTS = new Set(["Agent", "TeamCreate", "TeamDelete"]);

export const filterSubAgentRegistry = (
  registry: ToolRegistry,
  allowedTools?: string[],
): ToolRegistry => {
  const filtered = Object.fromEntries(
    Object.entries(registry).filter(([name]) => !EXCLUDED_FROM_SUBAGENTS.has(name)),
  );
  if (!allowedTools || allowedTools.length === 0) {
    return filtered;
  }
  return Object.fromEntries(
    Object.entries(filtered).filter(([name]) => allowedTools.includes(name)),
  );
};
