import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { getPackageVersion } from "../../utils/packageVersion.js";
import type { McpServerConfig } from "./mcpConfig.js";
import { isHttpConfig, isStdioConfig } from "./mcpConfig.js";

export type McpConnection = {
  serverName: string;
  client: Client;
};

export const connectMcpServer = async (
  serverName: string,
  config: McpServerConfig,
): Promise<McpConnection> => {
  const client = new Client({ name: "perception", version: getPackageVersion() });
  const transport = isStdioConfig(config)
    ? new StdioClientTransport({
        command: config.command,
        args: config.args ?? [],
        env: filterEnv({ ...process.env, ...config.env }),
      })
    : isHttpConfig(config)
      ? new StreamableHTTPClientTransport(new URL(config.url), {
          requestInit: config.headers ? { headers: config.headers } : undefined,
        })
      : null;

  if (!transport) {
    throw new Error(`Unsupported MCP config for server ${serverName}`);
  }

  await client.connect(transport);
  return { serverName, client };
};

export const closeMcpConnection = async (connection: McpConnection): Promise<void> => {
  await connection.client.close();
};

const filterEnv = (env: Record<string, string | undefined>): Record<string, string> =>
  Object.fromEntries(
    Object.entries(env).filter((entry): entry is [string, string] => entry[1] !== undefined),
  );
