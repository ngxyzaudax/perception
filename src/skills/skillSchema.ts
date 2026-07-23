import { parseFrontmatter } from "../utils/frontmatter.js";

export type SkillDefinition = {
  commandName: string;
  name: string;
  description: string;
  directory: string;
  body: string;
  userInvocable: boolean;
  disableModelInvocation: boolean;
  allowedTools: string[];
  model?: string;
  runAsAgent: boolean;
};

export const parseSkillFile = (
  commandName: string,
  directory: string,
  content: string,
): SkillDefinition => {
  const parsed = parseFrontmatter(content);
  const name = parsed.frontmatter.name ?? commandName;
  const description = parsed.frontmatter.description ?? name;
  return {
    commandName,
    name,
    description,
    directory,
    body: parsed.body,
    userInvocable: parseBoolean(parsed.frontmatter["user-invocable"], true),
    disableModelInvocation: parseBoolean(
      parsed.frontmatter["disable-model-invocation"],
      false,
    ),
    allowedTools: parseToolList(parsed.frontmatter["allowed-tools"]),
    model: parsed.frontmatter.model,
    runAsAgent: parseBoolean(parsed.frontmatter.agent, false),
  };
};

const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) {
    return fallback;
  }
  return value === "true";
};

const parseToolList = (value: string | undefined): string[] => {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
};
