import type { SkillDefinition } from "../skills/skillSchema.js";

let registeredSkills: SkillDefinition[] = [];

export const registerSkillCommands = (skills: SkillDefinition[]): void => {
  registeredSkills = skills.filter((skill) => skill.userInvocable);
};

export const getRegisteredSkills = (): SkillDefinition[] => registeredSkills;
