import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { workItemFilePath, workItemHighwaterPath, workItemsDirectory } from "./workItemPaths.js";

export type WorkItemStatus = "pending" | "in_progress" | "completed";

export type WorkItem = {
  id: string;
  subject: string;
  description: string;
  status: WorkItemStatus;
  activeForm?: string;
  owner?: string;
  blocks: string[];
  blockedBy: string[];
  metadata?: Record<string, unknown>;
};

export type CreateWorkItemInput = {
  subject: string;
  description: string;
  activeForm?: string;
  metadata?: Record<string, unknown>;
};

export type UpdateWorkItemInput = {
  subject?: string;
  description?: string;
  activeForm?: string;
  status?: WorkItemStatus | "deleted";
  addBlocks?: string[];
  addBlockedBy?: string[];
  owner?: string;
  metadata?: Record<string, unknown>;
};

export const createWorkItem = async (
  sessionId: string,
  input: CreateWorkItemInput,
): Promise<WorkItem> => {
  const id = await nextWorkItemId(sessionId);
  const item: WorkItem = {
    id,
    subject: input.subject,
    description: input.description,
    status: "pending",
    activeForm: input.activeForm,
    blocks: [],
    blockedBy: [],
    metadata: input.metadata,
  };
  await saveWorkItem(sessionId, item);
  return item;
};

export const updateWorkItem = async (
  sessionId: string,
  taskId: string,
  patch: UpdateWorkItemInput,
): Promise<WorkItem | null> => {
  const current = await getWorkItem(sessionId, taskId);
  if (!current) {
    return null;
  }
  if (patch.status === "deleted") {
    await rm(workItemFilePath(sessionId, taskId), { force: true });
    return null;
  }
  const metadata = mergeMetadata(current.metadata, patch.metadata);
  const next: WorkItem = {
    ...current,
    subject: patch.subject ?? current.subject,
    description: patch.description ?? current.description,
    activeForm: patch.activeForm ?? current.activeForm,
    status: patch.status ?? current.status,
    owner: patch.owner ?? current.owner,
    blocks: mergeUnique(current.blocks, patch.addBlocks ?? []),
    blockedBy: mergeUnique(current.blockedBy, patch.addBlockedBy ?? []),
    metadata,
  };
  await saveWorkItem(sessionId, next);
  return next;
};

export const getWorkItem = async (
  sessionId: string,
  taskId: string,
): Promise<WorkItem | null> => {
  try {
    const raw = await readFile(workItemFilePath(sessionId, taskId), "utf8");
    return JSON.parse(raw) as WorkItem;
  } catch {
    return null;
  }
};

export const listWorkItems = async (sessionId: string): Promise<WorkItem[]> => {
  const { readdir } = await import("node:fs/promises");
  const directory = workItemsDirectory(sessionId);
  let entries: string[];
  try {
    entries = await readdir(directory);
  } catch {
    return [];
  }
  const items = await Promise.all(
    entries
      .filter((entry) => entry.endsWith(".json"))
      .map((entry) => getWorkItem(sessionId, entry.replace(/\.json$/, ""))),
  );
  return items
    .filter((item): item is WorkItem => item !== null)
    .sort((left, right) => Number(left.id) - Number(right.id));
};

export const formatWorkItemList = async (sessionId: string): Promise<string> => {
  const items = await listWorkItems(sessionId);
  if (items.length === 0) {
    return "no work items";
  }
  return items
    .map(
      (item) =>
        `${item.id} [${item.status}] ${item.subject}${item.owner ? ` owner=${item.owner}` : ""}`,
    )
    .join("\n");
};

const nextWorkItemId = async (sessionId: string): Promise<string> => {
  await mkdir(workItemsDirectory(sessionId), { recursive: true });
  const path = workItemHighwaterPath(sessionId);
  let current = 0;
  try {
    current = Number((await readFile(path, "utf8")).trim());
  } catch {
    current = 0;
  }
  const next = current + 1;
  await writeFile(path, String(next), "utf8");
  return String(next);
};

const saveWorkItem = async (sessionId: string, item: WorkItem): Promise<void> => {
  await mkdir(workItemsDirectory(sessionId), { recursive: true });
  await writeFile(workItemFilePath(sessionId, item.id), `${JSON.stringify(item, null, 2)}\n`, "utf8");
};

const mergeUnique = (current: string[], added: string[]): string[] =>
  [...new Set([...current, ...added])];

const mergeMetadata = (
  current: Record<string, unknown> | undefined,
  patch: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined => {
  if (!patch) {
    return current;
  }
  const next = { ...(current ?? {}) };
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) {
      delete next[key];
    } else {
      next[key] = value;
    }
  }
  return Object.keys(next).length > 0 ? next : undefined;
};
