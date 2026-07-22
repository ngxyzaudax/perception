import { buildSystemPrompt } from "../../context/systemPrompt.js";
import { createPermissionContext } from "../../permissions/checkPermission.js";
import { runQuery } from "../../query/queryEngine.js";
import { loadSettings } from "../../utils/config.js";
import { createToolRegistry } from "../../tools.js";
import type { ChatMessage } from "../../types/messages.js";

export const runSmokeQuery = async (prompt: string): Promise<string> => {
  const settings = await loadSettings();
  const registry = createToolRegistry();
  const messages: ChatMessage[] = [{ role: "user", content: prompt }];
  let output = "";

  await runQuery({
    settings: { ...settings, permissionMode: "bypassPermissions" },
    registry,
    messages,
    permissionContext: createPermissionContext("bypassPermissions", []),
    onEvent: (event) => {
      if (event.type === "text_delta") {
        output += event.text;
      }
    },
  });

  const systemPrompt = await buildSystemPrompt();
  if (systemPrompt.length === 0) {
    throw new Error("system prompt unavailable");
  }

  return output.trim();
};
