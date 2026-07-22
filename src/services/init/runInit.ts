import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { createPermissionContext } from "../../permissions/checkPermission.js";
import { runQuery } from "../../query/queryEngine.js";
import type { Settings } from "../../schemas/settings.js";
import { projectMemoryPath } from "../sessions/sessionPaths.js";
import { createToolRegistry } from "../../tools.js";
import type { ChatMessage } from "../../types/messages.js";
import { buildInitPrompt } from "../../utils/toolDisplay.js";

export const runInit = async (settings: Settings): Promise<string> => {
  const registry = createToolRegistry();
  const messages: ChatMessage[] = [{ role: "user", content: buildInitPrompt() }];
  const result = await runQuery({
    settings: { ...settings, permissionMode: "bypassPermissions" },
    registry,
    messages,
    permissionContext: createPermissionContext("bypassPermissions", []),
    onEvent: () => undefined,
  });
  const lastAssistant = [...result.messages]
    .reverse()
    .find((message) => message.role === "assistant");
  const brief = lastAssistant?.content?.trim();
  if (!brief) {
    return "init failed: model produced no brief";
  }
  const path = projectMemoryPath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${brief}\n`, "utf8");
  return `wrote project memory to ${path}`;
};
