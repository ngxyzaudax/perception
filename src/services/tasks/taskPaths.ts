import { join } from "node:path";
import { perceptionHome } from "../sessions/sessionPaths.js";

export const taskOutputRoot = (): string => join(perceptionHome(), "tasks");

export const taskOutputPath = (sessionId: string, taskId: string): string =>
  join(taskOutputRoot(), sessionId, `${taskId}.txt`);

export const createTaskId = (): string =>
  `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const agentTranscriptPath = (sessionId: string, agentId: string): string =>
  join(taskOutputRoot(), sessionId, `${agentId}.txt`);
