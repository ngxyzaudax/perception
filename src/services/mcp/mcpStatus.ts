export type McpServerStatus = {
  serverName: string;
  toolCount: number;
  resourceCount: number;
  error?: string;
};

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

export const mcpHealthSummary = (statuses: McpServerStatus[]): string | null => {
  if (statuses.length === 0) {
    return null;
  }
  const failing = statuses.filter((status) => status.error).length;
  return failing > 0
    ? `mcp ${statuses.length - failing}/${statuses.length}`
    : `mcp ${statuses.length}`;
};
