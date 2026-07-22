import { z } from "zod";
import { buildTool } from "../Tool.js";
import { formatMcpResources, listMcpResources } from "../services/mcp/mcpResources.js";

const inputSchema = z.object({});

export const ListMcpResourcesTool = buildTool({
  name: "ListMcpResources",
  description: "List resources exposed by connected MCP servers",
  inputSchema,
  isReadOnly: () => true,
  summarize: () => "list MCP resources",
  call: async () => formatMcpResources(listMcpResources()),
});
