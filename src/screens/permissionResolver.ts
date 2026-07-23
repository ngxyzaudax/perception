import type { Dispatch, SetStateAction } from "react";
import { matchesRule } from "../permissions/rules.js";
import type { PermissionResult } from "../types/permissions.js";
import type { QuestionOption } from "../types/questions.js";
import type { DiffPreview } from "../utils/diffLines.js";

export type PendingPermission = {
  toolName: string;
  summary: string;
  preview?: DiffPreview;
  suggestedPersistRule?: string;
  resolve: (result: PermissionResult) => void;
};

export type PermissionQueueSetter = Dispatch<SetStateAction<PendingPermission[]>>;

export const createPermissionResolver =
  (setQueue: PermissionQueueSetter) =>
  async (request: {
    toolName: string;
    summary: string;
    preview?: DiffPreview;
    suggestedPersistRule?: string;
  }): Promise<PermissionResult> =>
    new Promise((resolve) => {
      setQueue((current) => [
        ...current,
        {
          toolName: request.toolName,
          summary: request.summary,
          preview: request.preview,
          suggestedPersistRule: request.suggestedPersistRule,
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
  options: QuestionOption[];
  resolve: (answer: string) => void;
  reject: (error: Error) => void;
};

export type QuestionSetter = Dispatch<SetStateAction<PendingQuestion | null>>;

export const createQuestionResolver =
  (setPending: QuestionSetter) =>
  async (
    question: string,
    options: readonly QuestionOption[],
    signal?: AbortSignal,
  ): Promise<string> =>
    new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new Error("question cancelled"));
        return;
      }
      const onAbort = (): void => {
        setPending(null);
        reject(new Error("question cancelled"));
      };
      signal?.addEventListener("abort", onAbort, { once: true });
      const clearAbort = (): void => {
        signal?.removeEventListener("abort", onAbort);
      };
      setPending({
        question,
        options: [...options],
        resolve: (answer: string): void => {
          clearAbort();
          resolve(answer);
        },
        reject: (error: Error): void => {
          clearAbort();
          reject(error);
        },
      });
    });

export const settleQuestionAnswer = (
  pending: PendingQuestion | null,
  answer: string,
): null => {
  pending?.resolve(answer);
  return null;
};

export const settleQuestionCancel = (pending: PendingQuestion | null): null => {
  pending?.reject(new Error("question cancelled"));
  return null;
};
