import type {
  SlashActionContext,
  SlashActionResult,
} from "../screens/slashActionTypes.js";

export type Command = {
  name: string;
  description: string;
  argumentHint?: string;
  execute: (context: SlashActionContext) => Promise<SlashActionResult>;
};

export type CommandCompletion = {
  name: string;
  description: string;
};
