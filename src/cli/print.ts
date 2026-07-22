import { createPermissionContext } from "../permissions/checkPermission.js";
import { runQuery } from "../query/queryEngine.js";
import type { Settings } from "../schemas/settings.js";
import { closeMcpConnections, connectMcpTools } from "../services/mcp/mcpManager.js";
import { createToolRegistry } from "../tools.js";
import type { ChatMessage } from "../types/messages.js";

export const runPrintMode = async (
  settings: Settings,
  prompt: string,
): Promise<number> => {
  const { tools } = await connectMcpTools();
  const registry = createToolRegistry(tools);
  const messages: ChatMessage[] = [{ role: "user", content: prompt }];

  try {
    await runQuery({
      settings,
      registry,
      messages,
      permissionContext: createPermissionContext(
        settings.permissionMode === "default"
          ? "bypassPermissions"
          : settings.permissionMode,
        [],
      ),
      onEvent: (event) => {
        if (event.type === "reasoning_delta") {
          process.stderr.write(event.text);
        }
        if (event.type === "text_delta") {
          process.stdout.write(event.text);
        }
        if (event.type === "tool_start") {
          process.stderr.write(`[tool] ${event.name}\n`);
        }
        if (event.type === "tool_end" && event.isError) {
          process.stderr.write(`[tool error] ${event.name}: ${event.output}\n`);
        }
      },
    });
    process.stdout.write("\n");
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : "query failed";
    process.stderr.write(`${message}\n`);
    return 1;
  } finally {
    await closeMcpConnections();
  }
};
