import { filterCommandCompletions } from "../../commands/registry.js";
import type { CommandCompletion } from "../../commands/types.js";

export type SlashCommandDefinition = CommandCompletion;

export const filterSlashCommands = (input: string): SlashCommandDefinition[] =>
  filterCommandCompletions(input);
