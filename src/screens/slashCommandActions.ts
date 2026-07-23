import { combineCoordinatorPrompt } from "../context/coordinatorPrompt.js";
import { buildSystemPrompt } from "../context/systemPrompt.js";
import { approvePlan, createPermissionContext } from "../permissions/checkPermission.js";
import {
  getShadowRepoStatus,
  restoreCheckpoint,
} from "../services/checkpoints/shadowRepo.js";
import { listTrackedCheckpoints } from "../services/checkpoints/checkpointState.js";
import type { ChatMessage } from "../types/messages.js";
import { findCommand } from "../commands/registry.js";
import type { SlashActionContext, SlashActionResult } from "./slashActionTypes.js";
import { runUserPromptAction } from "./slashUserPrompt.js";

export type { SlashActionContext, SlashActionResult } from "./slashActionTypes.js";

export const executeSlashAction = async (
  context: SlashActionContext,
): Promise<SlashActionResult> => {
  const command = findCommand(context.input);
  if (command) {
    return command.execute(context);
  }
  return runUserPromptAction(context);
};

export const resolveCoordinatorPrompt = async (coordinatorMode: boolean): Promise<string | undefined> => {
  if (!coordinatorMode) {
    return undefined;
  }
  const base = await buildSystemPrompt();
  return combineCoordinatorPrompt(base);
};

export const restoreRewindCheckpoint = async (
  sha: string,
  messages: ChatMessage[],
): Promise<{ messages: ChatMessage[]; label: string } | null> => {
  const tracked = listTrackedCheckpoints();
  const checkpoint = tracked.find((entry) => entry.sha === sha);
  if (!checkpoint) {
    return null;
  }
  const restored = await restoreCheckpoint(sha);
  if (!restored) {
    return null;
  }
  return {
    messages: messages.slice(0, checkpoint.messageCount),
    label: checkpoint.label,
  };
};

export const getRewindUnavailableMessage = async (): Promise<string> => {
  const status = await getShadowRepoStatus();
  return status.enabled ? "no checkpoints yet" : status.reason ?? "checkpoints unavailable";
};

export const approvePlanContext = (
  context: ReturnType<typeof createPermissionContext>,
): ReturnType<typeof createPermissionContext> => approvePlan(context);
