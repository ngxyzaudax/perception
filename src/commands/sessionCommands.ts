import { clearTrackedCheckpoints } from "../services/checkpoints/checkpointState.js";
import { exportConversation } from "../services/export/exportConversation.js";
import { setActiveSessionId } from "../state/backgroundTasks.js";
import { clearReadFileState } from "../state/readFileState.js";
import type { Command } from "./types.js";

export const sessionCommands: Command[] = [
  {
    name: "/exit",
    description: "Exit perception",
    execute: async () => ({ type: "exit" }),
  },
  {
    name: "/clear",
    description: "Clear conversation",
    execute: async (context) => {
      clearReadFileState();
      clearTrackedCheckpoints();
      context.session.startFreshSession();
      setActiveSessionId(context.session.getSessionId());
      return { type: "clear" };
    },
  },
  {
    name: "/resume",
    description: "Resume a saved session",
    execute: async () => ({ type: "resume" }),
  },
  {
    name: "/rewind",
    description: "Rewind to checkpoint",
    execute: async () => ({ type: "rewind" }),
  },
  {
    name: "/export",
    description: "Export conversation",
    execute: async (context) => {
      const path = await exportConversation(
        context.session.getSessionId(),
        context.messages,
      );
      return { type: "status", content: `exported to ${path}`, title: "Export" };
    },
  },
  {
    name: "/branch",
    description: "Branch current session",
    execute: async (context) => {
      const branchId = context.session.branchSession(context.messages);
      setActiveSessionId(branchId);
      return { type: "branch", sessionId: branchId };
    },
  },
];
