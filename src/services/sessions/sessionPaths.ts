import { homedir } from "node:os";
import { join } from "node:path";
import { getCwd } from "../../utils/cwd.js";

export const perceptionHome = (): string =>
  process.env.PERCEPTION_HOME ?? join(homedir(), ".perception");

export const sessionsRoot = (): string => join(perceptionHome(), "sessions");

export const cwdSlug = (cwd: string = getCwd()): string =>
  cwd.replace(/^\/+/, "").replace(/[/\\:]/g, "--") || "root";

export const sessionDirectory = (cwd: string = getCwd()): string =>
  join(sessionsRoot(), cwdSlug(cwd));

export const sessionFilePath = (sessionId: string, cwd: string = getCwd()): string =>
  join(sessionDirectory(cwd), `${sessionId}.json`);

export const globalMemoryPath = (): string => join(perceptionHome(), "memory.md");

export const projectMemoryPath = (): string =>
  join(getCwd(), ".perception", "memory.md");
