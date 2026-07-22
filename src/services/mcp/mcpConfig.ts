import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { perceptionHome } from "../sessions/sessionPaths.js";
import { getCwd } from "../../utils/cwd.js";

const stdioServerSchema = z.object({
  command: z.string(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
});

const httpServerSchema = z.object({
  url: z.string().url(),
  headers: z.record(z.string()).optional(),
});

export const mcpServerConfigSchema = z.union([stdioServerSchema, httpServerSchema]);

export const mcpConfigSchema = z.object({
  mcpServers: z.record(mcpServerConfigSchema),
});

export type McpServerConfig = z.infer<typeof mcpServerConfigSchema>;
export type McpConfig = z.infer<typeof mcpConfigSchema>;

export const globalMcpConfigPath = (): string => join(perceptionHome(), "mcp.json");

export const projectMcpConfigPath = (): string => join(getCwd(), ".perception", "mcp.json");

export const loadMcpConfig = async (): Promise<McpConfig> => {
  const global = await readMcpFile(globalMcpConfigPath());
  const project = await readMcpFile(projectMcpConfigPath());
  return {
    mcpServers: {
      ...global.mcpServers,
      ...project.mcpServers,
    },
  };
};

const readMcpFile = async (path: string): Promise<McpConfig> => {
  try {
    const raw = await readFile(path, "utf8");
    return mcpConfigSchema.parse(JSON.parse(raw));
  } catch {
    return { mcpServers: {} };
  }
};

export const isStdioConfig = (
  config: McpServerConfig,
): config is z.infer<typeof stdioServerSchema> => "command" in config;

export const isHttpConfig = (
  config: McpServerConfig,
): config is z.infer<typeof httpServerSchema> => "url" in config;
