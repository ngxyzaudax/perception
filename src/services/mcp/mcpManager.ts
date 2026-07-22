import type { AnyToolDefinition } from "../../Tool.js";
import { closeMcpConnection, connectMcpServer, type McpConnection } from "./mcpClient.js";
import { loadMcpConfig } from "./mcpConfig.js";
import {
  listMcpResources,
  readMcpResource,
  setActiveResources,
  type McpResourceEntry,
} from "./mcpResources.js";
import { wrapMcpTools } from "./mcpTools.js";

export type McpServerStatus = {
  serverName: string;
  toolCount: number;
  resourceCount: number;
  error?: string;
};

let activeConnections: McpConnection[] = [];
let lastStatuses: McpServerStatus[] = [];

export const connectMcpTools = async (): Promise<{
  tools: AnyToolDefinition[];
  statuses: McpServerStatus[];
}> => {
  await closeMcpConnections();
  const config = await loadMcpConfig();
  const entries = Object.entries(config.mcpServers);
  if (entries.length === 0) {
    lastStatuses = [];
    setActiveResources([]);
    return { tools: [], statuses: [] };
  }

  const tools: AnyToolDefinition[] = [];
  const statuses: McpServerStatus[] = [];
  const resources: McpResourceEntry[] = [];

  for (const [serverName, serverConfig] of entries) {
    try {
      const connection = await connectMcpServer(serverName, serverConfig);
      activeConnections.push(connection);
      const listed = await connection.client.listTools();
      const wrapped = wrapMcpTools(serverName, connection.client, listed.tools);
      tools.push(...wrapped);
      const listedResources = await connection.client.listResources();
      resources.push(
        ...listedResources.resources.map((resource) => ({
          serverName,
          uri: resource.uri,
          name: resource.name,
          description: resource.description,
        })),
      );
      statuses.push({
        serverName,
        toolCount: wrapped.length,
        resourceCount: listedResources.resources.length,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "connection failed";
      statuses.push({ serverName, toolCount: 0, resourceCount: 0, error: message });
    }
  }

  setActiveResources(resources);
  lastStatuses = statuses;
  return { tools, statuses };
};

export const closeMcpConnections = async (): Promise<void> => {
  await Promise.all(activeConnections.map((connection) => closeMcpConnection(connection)));
  activeConnections = [];
  lastStatuses = [];
  setActiveResources([]);
};

export const getMcpStatuses = (): McpServerStatus[] => lastStatuses;

export const readMcpResourceFromManager = async (
  serverName: string,
  uri: string,
): Promise<string> => readMcpResource(activeConnections, serverName, uri);

export const formatMcpStatus = (statuses: McpServerStatus[]): string => {
  if (statuses.length === 0) {
    return "no MCP servers configured";
  }
  return statuses
    .map((status) =>
      status.error
        ? `${status.serverName}: error (${status.error})`
        : `${status.serverName}: ${status.toolCount} tools, ${status.resourceCount} resources`,
    )
    .join("\n");
};

export const getMcpResourceCount = (): number => listMcpResources().length;
