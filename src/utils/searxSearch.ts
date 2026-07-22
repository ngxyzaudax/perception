import { parseSearxJson, type SearchResult } from "./searchResults.js";

export const DEFAULT_SEARX_URLS: readonly string[] = [
  "https://priv.au",
  "https://searx.tiekoetter.com",
  "https://searx.rhscz.eu",
  "https://search.mdosch.de",
  "https://paulgo.io",
  "https://ooglester.com",
  "https://searx.dresden.network",
  "https://search.rowie.at",
  "https://etsi.me",
  "https://searxng.gr",
];

type SearxSearchInput = {
  urls: readonly string[];
  searchTerm: string;
  limit: number;
  signal: AbortSignal;
  timeoutMs?: number;
};

export const searchSearx = async (input: SearxSearchInput): Promise<SearchResult[]> => {
  const errors: string[] = [];
  for (const baseUrl of input.urls) {
    try {
      const results = await fetchSearxMirror({
        baseUrl,
        searchTerm: input.searchTerm,
        limit: input.limit,
        signal: input.signal,
        timeoutMs: input.timeoutMs,
      });
      if (results.length > 0) {
        return results;
      }
      errors.push(`${baseUrl}: no results`);
    } catch (error) {
      errors.push(`${baseUrl}: ${errorMessage(error)}`);
    }
  }
  throw new Error(`SearXNG search failed on all mirrors:\n${errors.join("\n")}`);
};

const fetchSearxMirror = async (input: {
  baseUrl: string;
  searchTerm: string;
  limit: number;
  signal: AbortSignal;
  timeoutMs?: number;
}): Promise<SearchResult[]> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? 15000);
  const linked = linkAbortSignals(input.signal, controller.signal);
  try {
    const response = await fetch(buildSearchUrl(input.baseUrl, input.searchTerm), {
      signal: linked,
      headers: {
        Accept: "application/json",
        "User-Agent": "perception/0.1 (SearXNG client)",
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }
    const contentType = response.headers.get("content-type") ?? "";
    const body = await response.text();
    if (!contentType.includes("json") && !body.trimStart().startsWith("{")) {
      throw new Error("non-JSON response (bot check or HTML)");
    }
    return parseSearxJson(JSON.parse(body), input.limit);
  } finally {
    clearTimeout(timeout);
  }
};

export const buildSearchUrl = (baseUrl: string, searchTerm: string): string => {
  const root = baseUrl.replace(/\/+$/, "");
  const query = new URLSearchParams({
    q: searchTerm,
    format: "json",
    language: "en",
  });
  return `${root}/search?${query.toString()}`;
};

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "request failed";

const linkAbortSignals = (primary: AbortSignal, secondary: AbortSignal): AbortSignal => {
  if (primary.aborted) {
    return primary;
  }
  const controller = new AbortController();
  const abort = (): void => controller.abort();
  primary.addEventListener("abort", abort, { once: true });
  secondary.addEventListener("abort", abort, { once: true });
  return controller.signal;
};
