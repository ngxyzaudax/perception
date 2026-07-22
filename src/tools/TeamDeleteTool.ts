import { z } from "zod";
import { buildTool } from "../Tool.js";
import { deleteTeam } from "../state/teams.js";

const inputSchema = z.object({
  team_name: z.string().describe("Team name to delete"),
});

export const TeamDeleteTool = buildTool({
  name: "TeamDelete",
  description: "Delete a team and its configuration",
  inputSchema,
  isReadOnly: () => false,
  summarize: (input) => input.team_name,
  call: async (input) => {
    const deleted = await deleteTeam(input.team_name);
    return deleted
      ? `Deleted team ${input.team_name}`
      : `Team ${input.team_name} not found`;
  },
});
