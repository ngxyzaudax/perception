import { parseFrontmatter } from "../utils/frontmatter.js";

export type SkillDefinition = {
  commandName: string;
  name: string;
  description: string;
  directory: string;
  body: string;
  userInvocable: boolean;
  disableModelInvocation: boolean;
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
  };
};

const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) {
    return fallback;
  }
  return value === "true";
};
