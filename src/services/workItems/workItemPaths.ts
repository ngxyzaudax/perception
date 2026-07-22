import { join } from "node:path";
import { getCwd } from "../../utils/cwd.js";

export const workItemsDirectory = (sessionId: string, cwd: string = getCwd()): string =>
  join(cwd, ".perception", "tasks", sessionId);

export const workItemFilePath = (
  sessionId: string,
  taskId: string,
  cwd: string = getCwd(),
): string => join(workItemsDirectory(sessionId, cwd), `${taskId}.json`);

export const workItemHighwaterPath = (sessionId: string, cwd: string = getCwd()): string =>
  join(workItemsDirectory(sessionId, cwd), ".highwatermark");
