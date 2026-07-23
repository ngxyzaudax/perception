import { createPermissionContext } from "../permissions/checkPermission.js";
import { runQuery } from "../query/queryEngine.js";
import type { Settings } from "../schemas/settings.js";
import { closeMcpConnections, connectMcpTools } from "../services/mcp/mcpManager.js";
import { createToolRegistry } from "../tools.js";
import type { ChatMessage, QueryEvent } from "../types/messages.js";
import { formatEventLine, formatJsonResult } from "./printOutput.js";
import type { PrintOutputFormat } from "./printOutput.js";

export const runPrintMode = async (
  settings: Settings,
  prompt: string,
  outputFormat: PrintOutputFormat = "text",
): Promise<number> => {
  const { tools } = await connectMcpTools();
  const registry = createToolRegistry(tools);
  const messages: ChatMessage[] = [{ role: "user", content: prompt }];

  try {
    const result = await runQuery({
      settings,
      registry,
      messages,
      permissionContext: createPermissionContext({
        mode: settings.permissionMode,
        alwaysAllowRules: settings.alwaysAllowRules,
        denyRules: settings.denyRules,
        askRules: settings.askRules,
        allowedDomains: settings.allowedDomains,
        additionalDirectories: settings.additionalDirectories,
      }),
      onEvent: buildEventWriter(outputFormat),
    });
    writeFinalOutput(outputFormat, result.messages);
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : "query failed";
    process.stderr.write(`${message}\n`);
    return 1;
  } finally {
    await closeMcpConnections();
  }
};

const buildEventWriter = (
  outputFormat: PrintOutputFormat,
): ((event: QueryEvent) => void) => {
  if (outputFormat === "stream-json") {
    return (event) => process.stdout.write(`${formatEventLine(event)}\n`);
  }
  if (outputFormat === "json") {
    return () => undefined;
  }
  return (event) => {
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
  };
};

const writeFinalOutput = (
  outputFormat: PrintOutputFormat,
  messages: ChatMessage[],
): void => {
  if (outputFormat === "json") {
    process.stdout.write(`${formatJsonResult(messages)}\n`);
    return;
  }
  if (outputFormat === "text") {
    process.stdout.write("\n");
  }
};
