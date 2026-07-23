import { z } from "zod";
import { buildTool } from "../Tool.js";
import { searchSearx } from "../utils/searxSearch.js";

const inputSchema = z.object({
  search_term: z.string().describe("Search query"),
  max_results: z.number().int().positive().optional().describe("Maximum results to return"),
});

export const WebSearchTool = buildTool({
  name: "WebSearch",
  description: "Search the web via configured SearXNG instance (JSON API)",
  inputSchema,
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  needsExplicitPermission: () => true,
  summarize: (input) => input.search_term,
  checkPermissions: async (_input, context) => {
    const mirrors = context.runtime?.settings.webSearchUrls ?? [];
    if (mirrors.length === 0) {
      return null;
    }
    const rules = context.runtime?.permissionContext.alwaysAllowRules ?? [];
    if (rules.some((rule) => rule === "WebSearch" || rule.startsWith("WebSearch("))) {
      return { granted: true };
    }
    return null;
  },
  call: async (input, context) => {
    const limit = Math.min(input.max_results ?? 5, 10);
    const urls = context.runtime?.settings.webSearchUrls ?? [];
    if (urls.length === 0) {
      return "No SearXNG mirrors configured. Add urls to webSearchUrls in ~/.perception/settings.json.";
    }
    try {
      const results = await searchSearx({
        urls,
        searchTerm: input.search_term,
        limit,
        signal: context.abortSignal,
      });
      return results
        .map(
          (result, index) =>
            `${index + 1}. ${result.title}\n${result.url}\n${result.snippet}`,
        )
        .join("\n\n");
    } catch (error) {
      return error instanceof Error ? error.message : "search failed";
    }
  },
});
