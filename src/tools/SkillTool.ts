import { z } from "zod";
import { buildTool } from "../Tool.js";
import type { SkillDefinition } from "../skills/skillSchema.js";
import { expandSkill, getSkillByName, loadSkills } from "../skills/loadSkills.js";

const inputSchema = z.object({
  skill: z.string().describe("Skill command name"),
  args: z.string().optional().describe("Arguments passed to the skill"),
});

let cachedSkills: SkillDefinition[] = [];

export const refreshSkills = async (): Promise<SkillDefinition[]> => {
  cachedSkills = await loadSkills();
  return cachedSkills;
};

export const getLoadedSkills = (): SkillDefinition[] => cachedSkills;

export const SkillTool = buildTool({
  name: "Skill",
  description: "Invoke a local skill by name with optional arguments",
  inputSchema,
  isReadOnly: () => true,
  summarize: (input) => input.skill,
  call: async (input) => {
    const skill = getSkillByName(cachedSkills, input.skill);
    if (!skill) {
      return `Unknown skill: ${input.skill}`;
    }
    if (skill.disableModelInvocation) {
      return `Skill ${input.skill} is not available for model invocation`;
    }
    return expandSkill(skill, input.args ?? "");
  },
});
