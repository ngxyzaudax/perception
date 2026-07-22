import type { Dispatch, SetStateAction } from "react";
import { matchesRule } from "../permissions/rules.js";
import type { PermissionResult } from "../types/permissions.js";
import type { DiffPreview } from "../utils/diffLines.js";

export type PendingPermission = {
  toolName: string;
  summary: string;
  preview?: DiffPreview;
  resolve: (result: PermissionResult) => void;
};

export type PermissionQueueSetter = Dispatch<SetStateAction<PendingPermission[]>>;

export const createPermissionResolver =
  (setQueue: PermissionQueueSetter) =>
  async (request: {
    toolName: string;
    summary: string;
    preview?: DiffPreview;
  }): Promise<PermissionResult> =>
    new Promise((resolve) => {
      setQueue((current) => [
        ...current,
        {
          toolName: request.toolName,
          summary: request.summary,
          preview: request.preview,
          resolve,
        },
      ]);
    });

export const resolvePermissionHead = (
  setQueue: PermissionQueueSetter,
  result: PermissionResult,
): void => {
  setQueue((current) => {
    const [head, ...rest] = current;
    head?.resolve(result);
    if (!result.granted || !result.persistRule) {
      return rest;
    }
    return resolveCoveredByRule(rest, result.persistRule);
  });
};

const resolveCoveredByRule = (
  queue: PendingPermission[],
  rule: string,
): PendingPermission[] => {
  const covered = queue.filter((entry) => matchesRule(rule, entry.toolName, entry.summary));
  for (const entry of covered) {
    entry.resolve({ granted: true });
  }
  return queue.filter((entry) => !matchesRule(rule, entry.toolName, entry.summary));
};

export type PendingQuestion = {
  question: string;
  options: string[];
  resolve: (answer: string) => void;
};

export const createQuestionResolver =
  (setPending: Dispatch<SetStateAction<PendingQuestion | null>>) =>
  async (question: string, options: string[]): Promise<string> =>
    new Promise((resolve) => {
      setPending({ question, options, resolve });
    });
