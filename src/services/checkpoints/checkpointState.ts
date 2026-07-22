import type { CheckpointEntry } from "./shadowRepo.js";

export type TrackedCheckpoint = CheckpointEntry & {
  messageCount: number;
};

const checkpoints: TrackedCheckpoint[] = [];

export const recordCheckpoint = (entry: CheckpointEntry, messageCount: number): void => {
  checkpoints.unshift({ ...entry, messageCount });
  if (checkpoints.length > 20) {
    checkpoints.length = 20;
  }
};

export const listTrackedCheckpoints = (): TrackedCheckpoint[] => [...checkpoints];

export const clearTrackedCheckpoints = (): void => {
  checkpoints.length = 0;
};

export const getCheckpointBySha = (sha: string): TrackedCheckpoint | undefined =>
  checkpoints.find((entry) => entry.sha === sha);
