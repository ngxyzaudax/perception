import { formatAgentList } from "../services/agents/loadAgents.js";
import { formatWorkItemList } from "../services/workItems/workItemStore.js";
import { getLoadedAgents, refreshAgents } from "../tools/AgentTool.js";
import { formatAgentTaskList, listAgentTasks } from "../state/agentTasks.js";
import { formatTaskList } from "../state/backgroundTasks.js";
import type { Command } from "./types.js";

export const taskCommands: Command[] = [
  {
    name: "/tasks",
    description: "Show background tasks",
    execute: async (context) => {
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
    },
  },
  {
    name: "/agents",
    description: "List loaded agents",
    execute: async () => {
      void refreshAgents();
      return { type: "status", content: formatAgentList(getLoadedAgents()), title: "Agents" };
    },
  },
  {
    name: "/coordinator",
    description: "Toggle coordinator mode",
    execute: async (context) => {
      context.onCoordinatorToggle();
      return { type: "toggle_coordinator" };
    },
  },
];
