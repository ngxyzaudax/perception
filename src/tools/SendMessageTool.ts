import { z } from "zod";
import { buildTool } from "../Tool.js";
import {
  broadcastToTeam,
  continueAgent,
} from "../services/agents/agentLifecycle.js";
import { enqueueNotification } from "../state/agentNotifications.js";

const inputSchema = z.object({
  to: z
    .string()
    .describe("Agent name, task id, '*' for team broadcast, or 'leader' from workers"),
  message: z.string().describe("Message to deliver to the target agent"),
  team_name: z.string().optional().describe("Team name when broadcasting with to='*'"),
});

export const SendMessageTool = buildTool({
  name: "SendMessage",
  description: "Send a message to another agent to continue or steer its work",
  inputSchema,
  isReadOnly: () => true,
  summarize: (input) => `${input.to}: ${input.message.slice(0, 40)}`,
  call: async (input, context) => {
    if (!context.runtime) {
      return "SendMessage runtime unavailable";
    }
    if (input.to === "leader") {
      enqueueNotification({
        content: input.message,
        agentId: "worker",
      });
      return "Message delivered to leader session";
    }
    if (input.to === "*") {
      if (!input.team_name) {
        return "team_name required for broadcast";
      }
      return broadcastToTeam(input.team_name, input.message, context.runtime);
    }
    return continueAgent(input.to, input.message, context.runtime);
  },
});
