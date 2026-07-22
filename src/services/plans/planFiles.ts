import { join } from "node:path";
import { cwdSlug, perceptionHome } from "../sessions/sessionPaths.js";

export const plansRoot = (): string => join(perceptionHome(), "plans");

export const planFilePath = (sessionId: string): string =>
  join(plansRoot(), `${cwdSlug()}-${sessionId}.md`);

export const readPlanFile = async (sessionId: string): Promise<string | null> => {
  try {
    const { readFile } = await import("node:fs/promises");
    return await readFile(planFilePath(sessionId), "utf8");
  } catch {
    return null;
  }
};

export const writePlanFile = async (sessionId: string, content: string): Promise<string> => {
  const { mkdir, writeFile } = await import("node:fs/promises");
  await mkdir(plansRoot(), { recursive: true });
  const path = planFilePath(sessionId);
  await writeFile(path, content, "utf8");
  return path;
};

export const resolvePlanPath = (sessionId: string): string => planFilePath(sessionId);

export const isPlanFilePath = (path: string, sessionId: string): boolean =>
  path === planFilePath(sessionId);
