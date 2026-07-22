import { loadMemory } from "../context/memory.js";
import { setPermissionMode } from "../permissions/checkPermission.js";
import { compactConversation } from "../services/compact/compactConversation.js";
import { createLlmClient, resolveModel } from "../services/llm/client.js";
import { clearTrackedCheckpoints } from "../services/checkpoints/checkpointState.js";
import { runInit } from "../services/init/runInit.js";
import { runDoctor } from "../services/doctor/runDoctor.js";
import { refreshAgents, getLoadedAgents } from "../tools/AgentTool.js";
import { formatMcpStatus, getMcpStatuses } from "../services/mcp/mcpManager.js";
import { formatAgentList } from "../services/agents/loadAgents.js";
import { formatTaskList, setActiveSessionId } from "../state/backgroundTasks.js";
import { formatAgentTaskList, listAgentTasks } from "../state/agentTasks.js";
import { formatWorkItemList } from "../services/workItems/workItemStore.js";
import { buildCommitPrompt, buildReviewPrompt } from "./promptCommands.js";
import { clearReadFileState } from "../state/readFileState.js";
import { getUsage } from "../state/usage.js";
import { exportConversation } from "../services/export/exportConversation.js";
import { formatTokensReport } from "../utils/tokens.js";
import { parseConfigCommand } from "./configCommand.js";
import { formatContextReport } from "./contextReport.js";
import { loadGitDiff } from "./gitDiff.js";
import { formatHelp } from "./helpText.js";
import { formatPlanStatus } from "./planStatus.js";
import type { SlashCommandResult } from "./replCommands.js";
import type { SlashActionContext, SlashActionResult } from "./slashActionTypes.js";

export const runBuiltInSlashCommand = async (
  command: SlashCommandResult,
  context: SlashActionContext,
): Promise<SlashActionResult | null> => {
  if (command.type === "exit") {
    return { type: "exit" };
  }
  if (command.type === "clear") {
    clearReadFileState();
    clearTrackedCheckpoints();
    context.session.startFreshSession();
    setActiveSessionId(context.session.getSessionId());
    return { type: "clear" };
  }
  if (command.type === "status") {
    const resolved = await resolveModel(createLlmClient(context.settings), context.settings.model);
    context.onModelResolved(resolved.modelId, resolved.maxContextTokens);
    return { type: "status", content: resolved.modelId, title: "Model" };
  }
  if (command.type === "permission_mode") {
    context.onPermissionContextUpdate(
      setPermissionMode(context.permissionContext, command.mode),
    );
    return { type: "update_permission_mode", mode: command.mode };
  }
  if (command.type === "plan_approve") {
    return { type: "approve_plan" };
  }
  if (command.type === "plan") {
    return {
      type: "status",
      content: await formatPlanStatus(context.session.getSessionId(), "plan"),
      title: "Plan",
    };
  }
  if (command.type === "resume") {
    return { type: "resume" };
  }
  if (command.type === "memory") {
    const memory = await loadMemory();
    return { type: "status", content: memory ?? "no memory files", title: "Memory" };
  }
  if (command.type === "compact") {
    const compacted = await compactConversation(context.settings, context.messages);
    context.session.persistSession(compacted);
    return { type: "set_messages", messages: compacted };
  }
  if (command.type === "mcp") {
    return { type: "status", content: formatMcpStatus(getMcpStatuses()), title: "MCP" };
  }
  if (command.type === "tokens") {
    return { type: "status", content: formatTokensReport(getUsage()), title: "Tokens" };
  }
  if (command.type === "help") {
    return {
      type: "status",
      content: formatHelp(context.skills, getLoadedAgents()),
      title: "Help",
    };
  }
  if (command.type === "doctor") {
    return { type: "status", content: await runDoctor(context.settings), title: "Doctor" };
  }
  if (command.type === "config") {
    const result = parseConfigCommand(context.input, context.settings);
    if (result.type === "updated") {
      return { type: "update_settings", settings: result.settings };
    }
    return { type: "status", content: result.message, title: "Config" };
  }
  if (command.type === "tasks") {
    const runningAgents = listAgentTasks(context.session.getSessionId()).filter(
      (task) => task.status === "running",
    ).length;
    return {
      type: "status",
      content: [
        "Background shell tasks:",
        formatTaskList(context.session.getSessionId()),
        "",
        "Agent tasks:",
        formatAgentTaskList(context.session.getSessionId()),
        runningAgents > 0 ? `${runningAgents} agent(s) running` : "",
        "",
        "Work items:",
        await formatWorkItemList(context.session.getSessionId()),
      ]
        .filter(Boolean)
        .join("\n\n"),
      title: "Tasks",
    };
  }
  if (command.type === "commit") {
    return {
      type: "query",
      messages: [
        ...context.messages,
        { role: "user", content: await buildCommitPrompt() },
      ],
    };
  }
  if (command.type === "review") {
    return {
      type: "query",
      messages: [
        ...context.messages,
        { role: "user", content: await buildReviewPrompt() },
      ],
    };
  }
  if (command.type === "agents") {
    void refreshAgents();
    return { type: "status", content: formatAgentList(getLoadedAgents()), title: "Agents" };
  }
  if (command.type === "diff") {
    return { type: "status", content: await loadGitDiff(), title: "Diff" };
  }
  if (command.type === "context") {
    const memory = await loadMemory();
    return {
      type: "status",
      content: formatContextReport(context.messages.length, memory?.length ?? 0),
      title: "Context",
    };
  }
  if (command.type === "rewind") {
    return { type: "rewind" };
  }
  if (command.type === "init") {
    return { type: "status", content: await runInit(context.settings), title: "Init" };
  }
  if (command.type === "export") {
    const path = await exportConversation(context.session.getSessionId(), context.messages);
    return { type: "status", content: `exported to ${path}`, title: "Export" };
  }
  if (command.type === "branch") {
    const branchId = context.session.branchSession(context.messages);
    setActiveSessionId(branchId);
    return { type: "branch", sessionId: branchId };
  }
  if (command.type === "coordinator") {
    context.onCoordinatorToggle();
    return { type: "toggle_coordinator" };
  }
  if (command.type === "query") {
    return null;
  }
  return null;
};
