import { z } from "zod";
import { buildTool } from "../Tool.js";
import { DEFAULT_SEARX_URLS, searchSearx } from "../utils/searxSearch.js";

const inputSchema = z.object({
  search_term: z.string().describe("Search query"),
  max_results: z.number().int().positive().optional().describe("Maximum results to return"),
});

export const WebSearchTool = buildTool({
  name: "WebSearch",
  description: "Search the web via public SearXNG mirrors (JSON API)",
  inputSchema,
  isReadOnly: () => true,
  summarize: (input) => input.search_term,
  call: async (input, context) => {
    const limit = Math.min(input.max_results ?? 5, 10);
    const urls = resolveSearxUrls(context.runtime?.settings.webSearchUrls);
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

const resolveSearxUrls = (configured: string[] | undefined): readonly string[] => {
  if (configured && configured.length > 0) {
    return configured;
  }
  return DEFAULT_SEARX_URLS;
};
