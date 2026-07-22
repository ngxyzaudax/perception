import { z } from "zod";
import { buildTool } from "../Tool.js";
import { readMcpResourceFromManager } from "../services/mcp/mcpManager.js";

const inputSchema = z.object({
  server: z.string().describe("MCP server name"),
  uri: z.string().describe("Resource URI to read"),
});

export const ReadMcpResourceTool = buildTool({
  name: "ReadMcpResource",
  description: "Read a resource from a connected MCP server",
  inputSchema,
  isReadOnly: () => true,
  summarize: (input) => `${input.server}:${input.uri}`,
  call: async (input) => readMcpResourceFromManager(input.server, input.uri),
});
