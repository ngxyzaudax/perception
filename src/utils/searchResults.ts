export type SearchResult = {
  title: string;
  url: string;
  snippet: string;
};

type SearxResultRow = {
  title?: unknown;
  url?: unknown;
  content?: unknown;
};

type SearxPayload = {
  results?: unknown;
};

export const parseSearxJson = (payload: unknown, limit: number = 5): SearchResult[] => {
  if (!isRecord(payload)) {
    return [];
  }
  const rows = (payload as SearxPayload).results;
  if (!Array.isArray(rows)) {
    return [];
  }
  const results: SearchResult[] = [];
  for (const row of rows) {
    if (results.length >= limit) {
      break;
    }
    const parsed = parseSearxRow(row);
    if (parsed) {
      results.push(parsed);
    }
  }
  return results;
};

const parseSearxRow = (row: unknown): SearchResult | null => {
  if (!isRecord(row)) {
    return null;
  }
  const entry = row as SearxResultRow;
  const title = asTrimmedString(entry.title);
  const url = asTrimmedString(entry.url);
  if (!title || !url) {
    return null;
  }
  return {
    title,
    url,
    snippet: asTrimmedString(entry.content) ?? "",
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const asTrimmedString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};
