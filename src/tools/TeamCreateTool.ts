import { z } from "zod";
import { buildTool } from "../Tool.js";
import { createTeam } from "../state/teams.js";

const inputSchema = z.object({
  team_name: z.string().describe("Unique team name"),
  description: z.string().describe("What this team is working on"),
});

export const TeamCreateTool = buildTool({
  name: "TeamCreate",
  description: "Create a team to coordinate multiple agents working on a project",
  inputSchema,
  isReadOnly: () => false,
  summarize: (input) => input.team_name,
  call: async (input) => {
    const team = await createTeam(input.team_name, input.description);
    return `Created team ${team.name}: ${team.description}`;
  },
});
