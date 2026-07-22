import type { McpConnection } from "./mcpClient.js";

export type McpResourceEntry = {
  serverName: string;
  uri: string;
  name: string;
  description?: string;
};

let activeResources: McpResourceEntry[] = [];

export const setActiveResources = (resources: McpResourceEntry[]): void => {
  activeResources = resources;
};

export const listMcpResources = (): McpResourceEntry[] => activeResources;

export const readMcpResource = async (
  connections: McpConnection[],
  serverName: string,
  uri: string,
): Promise<string> => {
  const connection = connections.find((entry) => entry.serverName === serverName);
  if (!connection) {
    return `Unknown MCP server: ${serverName}`;
  }
  const result = await connection.client.readResource({ uri });
  return result.contents
    .map((entry) => {
      if ("text" in entry && typeof entry.text === "string") {
        return entry.text;
      }
      return JSON.stringify(entry);
    })
    .join("\n");
};

export const formatMcpResources = (resources: McpResourceEntry[]): string => {
  if (resources.length === 0) {
    return "No MCP resources available";
  }
  return resources
    .map((resource) => `${resource.serverName} ${resource.uri} (${resource.name})`)
    .join("\n");
};
