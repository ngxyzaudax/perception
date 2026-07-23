import type { AnyToolDefinition } from "../../Tool.js";
import { loadMcpConfig } from "./mcpConfig.js";
import {
  listMcpResources,
  readMcpResource,
  setActiveResources,
} from "./mcpResources.js";
import {
  connectManagedServer,
  createManagedServer,
  disconnectManagedServer,
  type ManagedServer,
} from "./mcpServerLifecycle.js";
import type { McpServerStatus } from "./mcpStatus.js";

export { formatMcpStatus, mcpHealthSummary } from "./mcpStatus.js";
export type { McpServerStatus } from "./mcpStatus.js";

const RECONNECT_DELAYS_MS = [1000, 2000, 5000, 10000, 30000];
const MAX_RECONNECT_ATTEMPTS = 5;

const servers = new Map<string, ManagedServer>();
let toolsChangedHandler: ((tools: AnyToolDefinition[]) => void) | null = null;

export const setMcpToolsChangedHandler = (
  handler: ((tools: AnyToolDefinition[]) => void) | null,
): void => {
  toolsChangedHandler = handler;
};

const collectTools = (): AnyToolDefinition[] =>
  [...servers.values()].flatMap((server) => server.tools);

const syncResources = (): void => {
  setActiveResources([...servers.values()].flatMap((server) => server.resources));
};

const notifyToolsChanged = (): void => {
  syncResources();
  toolsChangedHandler?.(collectTools());
};

const connectServer = async (server: ManagedServer): Promise<void> => {
  try {
    await connectManagedServer(server, notifyToolsChanged, () =>
      scheduleReconnect(server, 0),
    );
  } catch (error) {
    server.error = error instanceof Error ? error.message : "connection failed";
  }
};

const scheduleReconnect = (server: ManagedServer, attempt: number): void => {
  if (!servers.has(server.serverName)) {
    return;
  }
  if (attempt >= MAX_RECONNECT_ATTEMPTS) {
    server.error = "disconnected, reconnect attempts exhausted";
    notifyToolsChanged();
    return;
  }
  server.error = `disconnected, reconnecting (attempt ${attempt + 1})`;
  const delay = RECONNECT_DELAYS_MS[Math.min(attempt, RECONNECT_DELAYS_MS.length - 1)]!;
  const timer = setTimeout(async () => {
    if (!servers.has(server.serverName)) {
      return;
    }
    try {
      await connectManagedServer(server, notifyToolsChanged, () =>
        scheduleReconnect(server, 0),
      );
      notifyToolsChanged();
    } catch {
      scheduleReconnect(server, attempt + 1);
    }
  }, delay);
  timer.unref?.();
};

export const connectMcpTools = async (): Promise<{
  tools: AnyToolDefinition[];
  statuses: McpServerStatus[];
}> => {
  await closeMcpConnections();
  const config = await loadMcpConfig();
  for (const [serverName, serverConfig] of Object.entries(config.mcpServers)) {
    const server = createManagedServer(serverName, serverConfig);
    servers.set(serverName, server);
    await connectServer(server);
  }
  syncResources();
  return { tools: collectTools(), statuses: getMcpStatuses() };
};

export const reconnectMcpServer = async (serverName: string): Promise<string> => {
  const server = servers.get(serverName);
  if (!server) {
    return `Unknown MCP server: ${serverName}`;
  }
  await disconnectManagedServer(server);
  await connectServer(server);
  notifyToolsChanged();
  return server.error
    ? `Reconnect failed for ${serverName}: ${server.error}`
    : `Reconnected ${serverName} (${server.tools.length} tools)`;
};

export const closeMcpConnections = async (): Promise<void> => {
  const active = [...servers.values()];
  servers.clear();
  await Promise.all(active.map(disconnectManagedServer));
  setActiveResources([]);
};

export const getMcpStatuses = (): McpServerStatus[] =>
  [...servers.values()].map((server) => ({
    serverName: server.serverName,
    toolCount: server.tools.length,
    resourceCount: server.resources.length,
    error: server.error,
  }));

export const readMcpResourceFromManager = async (
  serverName: string,
  uri: string,
): Promise<string> => {
  const connections = [...servers.values()]
    .map((server) => server.connection)
    .filter((connection): connection is NonNullable<typeof connection> => connection !== null);
  return readMcpResource(connections, serverName, uri);
};

export const getMcpResourceCount = (): number => listMcpResources().length;
