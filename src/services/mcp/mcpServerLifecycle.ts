import { ToolListChangedNotificationSchema } from "@modelcontextprotocol/sdk/types.js";
import type { AnyToolDefinition } from "../../Tool.js";
import { connectMcpServer, type McpConnection } from "./mcpClient.js";
import type { McpServerConfig } from "./mcpConfig.js";
import type { McpResourceEntry } from "./mcpResources.js";
import { wrapMcpTools } from "./mcpTools.js";

export type ManagedServer = {
  serverName: string;
  config: McpServerConfig;
  connection: McpConnection | null;
  tools: AnyToolDefinition[];
  resources: McpResourceEntry[];
  error?: string;
};

export const createManagedServer = (
  serverName: string,
  config: McpServerConfig,
): ManagedServer => ({
  serverName,
  config,
  connection: null,
  tools: [],
  resources: [],
});

export const connectManagedServer = async (
  server: ManagedServer,
  onToolsChanged: () => void,
  onDisconnect: () => void,
): Promise<void> => {
  const connection = await connectMcpServer(server.serverName, server.config);
  server.connection = connection;
  server.error = undefined;
  await refreshServerTools(server, connection, onToolsChanged);
  server.resources = await listServerResources(server.serverName, connection);
  connection.client.onclose = () => {
    if (server.connection === connection) {
      server.connection = null;
      onDisconnect();
    }
  };
};

export const disconnectManagedServer = async (
  server: ManagedServer,
): Promise<void> => {
  const connection = server.connection;
  server.connection = null;
  server.tools = [];
  server.resources = [];
  if (connection) {
    await connection.client.close().catch(() => undefined);
  }
};

const refreshServerTools = async (
  server: ManagedServer,
  connection: McpConnection,
  onToolsChanged: () => void,
): Promise<void> => {
  const listed = await connection.client.listTools();
  server.tools = wrapMcpTools(server.serverName, connection.client, listed.tools);
  connection.client.setNotificationHandler(
    ToolListChangedNotificationSchema,
    async () => {
      if (server.connection !== connection) {
        return;
      }
      const refreshed = await connection.client.listTools();
      server.tools = wrapMcpTools(server.serverName, connection.client, refreshed.tools);
      onToolsChanged();
    },
  );
};

const listServerResources = async (
  serverName: string,
  connection: McpConnection,
): Promise<McpResourceEntry[]> => {
  try {
    const listed = await connection.client.listResources();
    return listed.resources.map((resource) => ({
      serverName,
      uri: resource.uri,
      name: resource.name,
      description: resource.description,
    }));
  } catch {
    return [];
  }
};
