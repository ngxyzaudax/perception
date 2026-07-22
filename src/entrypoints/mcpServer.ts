import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createPermissionContext } from "../permissions/checkPermission.js";
import { loadSettings } from "../utils/config.js";
import { createToolRegistry } from "../tools.js";
import type { AnyToolDefinition } from "../Tool.js";

export const runMcpServer = async (): Promise<void> => {
  const settings = await loadSettings();
  const registry = createToolRegistry();
  const server = new McpServer({ name: "perception", version: "0.1.0" });
  const permissionContext = createPermissionContext("bypassPermissions", settings.alwaysAllowRules);

  for (const tool of Object.values(registry)) {
    registerMcpTool(server, tool, settings, permissionContext);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
};

const registerMcpTool = (
  server: McpServer,
  tool: AnyToolDefinition,
  settings: Awaited<ReturnType<typeof loadSettings>>,
  permissionContext: ReturnType<typeof createPermissionContext>,
): void => {
  server.registerTool(
    tool.name,
    {
      description: tool.description,
      inputSchema: tool.inputSchema,
    },
    async (args: Record<string, unknown>) => {
      const parsed = tool.inputSchema.parse(args);
      const output = await tool.call(parsed, {
        cwd: process.cwd(),
        abortSignal: new AbortController().signal,
        runtime: {
          settings,
          registry: createToolRegistry(),
          permissionContext,
          onEvent: () => {},
          sessionId: "mcp-server",
        },
      });
      return { content: [{ type: "text", text: output }] };
    },
  );
};
