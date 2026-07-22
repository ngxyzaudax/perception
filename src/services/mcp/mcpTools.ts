import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { z } from "zod";
import { buildTool, type AnyToolDefinition } from "../../Tool.js";

export const buildMcpToolName = (serverName: string, toolName: string): string =>
  `mcp__${serverName}__${toolName}`;

export const wrapMcpTools = (
  serverName: string,
  client: Client,
  tools: Array<{ name: string; description?: string }>,
): AnyToolDefinition[] =>
  tools.map((tool) =>
    buildTool({
      name: buildMcpToolName(serverName, tool.name),
      description: tool.description ?? `MCP tool ${tool.name} from ${serverName}`,
      inputSchema: z.record(z.unknown()),
      isReadOnly: () => false,
      summarize: (input) => `${serverName}/${tool.name}`,
      call: async (input) => flattenMcpResult(await client.callTool({ name: tool.name, arguments: input })),
    }),
  );

const flattenMcpResult = (result: Awaited<ReturnType<Client["callTool"]>>): string => {
  if ("content" in result && Array.isArray(result.content)) {
    return result.content
      .map((block) => {
        if (block.type === "text") {
          return block.text;
        }
        return JSON.stringify(block);
      })
      .join("\n");
  }
  return JSON.stringify(result);
};
