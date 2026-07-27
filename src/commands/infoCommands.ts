import { loadMemory } from "../context/memory.js";
import { createLlmClient, resolveModel } from "../services/llm/client.js";
import { runDoctor } from "../services/doctor/runDoctor.js";
import { formatMcpStatus, getMcpStatuses, reconnectMcpServer } from "../services/mcp/mcpManager.js";
import { getUsage } from "../state/usage.js";
import { formatTokensReport } from "../utils/tokens.js";
import { formatContextReport } from "../screens/contextReport.js";
import { loadGitDiff } from "../screens/gitDiff.js";
import { formatPlanStatus } from "../screens/planStatus.js";
import type { Command } from "./types.js";

export const infoCommands: Command[] = [
  {
    name: "/model",
    description: "Show current model",
    execute: async (context) => {
      const resolved = await resolveModel(
        createLlmClient(context.settings),
        context.settings.model,
      );
      context.onModelResolved(resolved.modelId, resolved.maxContextTokens);
      return { type: "status", content: resolved.modelId, title: "Model" };
    },
  },
  {
    name: "/tokens",
    description: "Show token usage",
    execute: async () => ({
      type: "status",
      content: formatTokensReport(getUsage()),
      title: "Tokens",
    }),
  },
  {
    name: "/memory",
    description: "Show project memory",
    execute: async () => {
      const memory = await loadMemory();
      return { type: "status", content: memory ?? "no memory files", title: "Memory" };
    },
  },
  {
    name: "/context",
    description: "Show context report",
    execute: async (context) => {
      const memory = await loadMemory();
      return {
        type: "status",
        content: formatContextReport(context.messages.length, memory?.length ?? 0),
        title: "Context",
      };
    },
  },
  {
    name: "/diff",
    description: "Show git diff",
    execute: async () => ({ type: "status", content: await loadGitDiff(), title: "Diff" }),
  },
  {
    name: "/plan",
    description: "Show plan status",
    execute: async (context) => ({
      type: "status",
      content: await formatPlanStatus(context.session.getSessionId(), "plan"),
      title: "Plan",
    }),
  },
  {
    name: "/mcp",
    description: "Show MCP server status or reconnect",
    argumentHint: "[reconnect <server>]",
    execute: async (context) => {
      const parts = context.input.trim().split(/\s+/);
      if (parts[1] === "reconnect" && parts[2]) {
        const message = await reconnectMcpServer(parts[2]);
        return { type: "status", content: message, title: "MCP" };
      }
      return { type: "status", content: formatMcpStatus(getMcpStatuses()), title: "MCP" };
    },
  },
  {
    name: "/doctor",
    description: "Run diagnostics",
    execute: async (context) => ({
      type: "status",
      content: await runDoctor(context.settings),
      title: "Doctor",
    }),
  },
];
