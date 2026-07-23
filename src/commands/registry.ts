import { controlCommands } from "./controlCommands.js";
import { infoCommands } from "./infoCommands.js";
import { queryCommands } from "./queryCommands.js";
import { sessionCommands } from "./sessionCommands.js";
import { taskCommands } from "./taskCommands.js";
import { getRegisteredSkills } from "./skillRegistry.js";
import type { Command, CommandCompletion } from "./types.js";

export { registerSkillCommands } from "./skillRegistry.js";

export const listCommands = (): Command[] => [
  ...sessionCommands,
  ...infoCommands,
  ...taskCommands,
  ...controlCommands,
  ...queryCommands,
];

export const findCommand = (input: string): Command | undefined => {
  const name = input.trim().split(/\s+/)[0];
  return listCommands().find((command) => command.name === name);
};

export const listCommandCompletions = (): CommandCompletion[] => {
  const builtIn = listCommands().map((command) => ({
    name: command.name,
    description: command.argumentHint
      ? `${command.description} (${command.argumentHint})`
      : command.description,
  }));
  const skills = getRegisteredSkills().map((skill) => ({
    name: `/${skill.commandName}`,
    description: skill.description,
  }));
  return [...builtIn, ...skills].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
};

export const filterCommandCompletions = (input: string): CommandCompletion[] => {
  if (!input.startsWith("/")) {
    return [];
  }
  const query = input.toLowerCase();
  return listCommandCompletions().filter((completion) =>
    completion.name.startsWith(query),
  );
};
