import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { SkillDefinition } from "./skillSchema.js";
import { parseSkillFile } from "./skillSchema.js";
import { globalSkillsRoot, projectSkillsRoot, skillFilePath } from "./skillPaths.js";

export const loadSkills = async (): Promise<SkillDefinition[]> => {
  const global = await loadSkillsFromRoot(globalSkillsRoot());
  const project = await loadSkillsFromRoot(projectSkillsRoot());
  const merged = new Map<string, SkillDefinition>();
  for (const skill of global) {
    merged.set(skill.commandName, skill);
  }
  for (const skill of project) {
    merged.set(skill.commandName, skill);
  }
  return [...merged.values()].sort((left, right) =>
    left.commandName.localeCompare(right.commandName),
  );
};

export const getSkillByName = (
  skills: SkillDefinition[],
  name: string,
): SkillDefinition | undefined =>
  skills.find(
    (skill) => skill.commandName === name || skill.name.toLowerCase() === name.toLowerCase(),
  );

export const expandSkill = (skill: SkillDefinition, args: string): string =>
  skill.body
    .replaceAll("$ARGUMENTS", args)
    .replaceAll("${PERCEPTION_SKILL_DIR}", skill.directory);

export const matchSkillCommand = (
  input: string,
  skills: SkillDefinition[],
): { skill: SkillDefinition; args: string } | null => {
  if (!input.startsWith("/")) {
    return null;
  }
  const trimmed = input.slice(1).trim();
  const spaceIndex = trimmed.indexOf(" ");
  const commandName = spaceIndex === -1 ? trimmed : trimmed.slice(0, spaceIndex);
  const args = spaceIndex === -1 ? "" : trimmed.slice(spaceIndex + 1).trim();
  const skill = getSkillByName(skills, commandName);
  if (!skill || !skill.userInvocable) {
    return null;
  }
  return { skill, args };
};

const loadSkillsFromRoot = async (root: string): Promise<SkillDefinition[]> => {
  let entries: string[];
  try {
    entries = await readdir(root, { withFileTypes: true }).then((items) =>
      items.filter((item) => item.isDirectory()).map((item) => item.name),
    );
  } catch {
    return [];
  }
  const skills = (
    await Promise.all(
      entries.map(async (commandName) => {
        try {
          const directory = join(root, commandName);
          const content = await readFile(skillFilePath(root, commandName), "utf8");
          return parseSkillFile(commandName, directory, content);
        } catch {
          return null;
        }
      }),
    )
  ).filter((skill): skill is SkillDefinition => skill !== null);
  return skills;
};
