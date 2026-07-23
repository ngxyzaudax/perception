import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { perceptionHome } from "../services/sessions/sessionPaths.js";
import { getCwd } from "../utils/cwd.js";

export const bundledSkillsRoot = (): string =>
  join(dirname(fileURLToPath(import.meta.url)), "bundled");

export const globalSkillsRoot = (): string => join(perceptionHome(), "skills");

export const projectSkillsRoot = (): string => join(getCwd(), ".perception", "skills");

export const skillFilePath = (root: string, skillName: string): string =>
  join(root, skillName, "SKILL.md");
