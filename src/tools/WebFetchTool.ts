import { z } from "zod";
import { buildTool } from "../Tool.js";
import { domainFromUrl, isDomainAllowed, matchesWebFetchAllowRule } from "../permissions/domains.js";
import { htmlToText } from "../utils/html.js";

const inputSchema = z.object({
  url: z.string().url().describe("URL to fetch"),
  max_chars: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Maximum characters to return"),
});

export const WebFetchTool = buildTool({
  name: "WebFetch",
  description: "Fetch a URL and return readable text content",
  inputSchema,
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  needsExplicitPermission: () => true,
  summarize: (input) => input.url,
  checkPermissions: async (input, context) => {
    const domain = domainFromUrl(input.url);
    if (!domain) {
      return { granted: false, reason: "invalid URL" };
    }
    const allowed = context.runtime?.settings.allowedDomains ?? [];
    const rules = context.runtime?.permissionContext.alwaysAllowRules ?? [];
    if (isDomainAllowed(domain, allowed) || matchesWebFetchAllowRule(rules, input.url)) {
      return { granted: true };
    }
    return null;
  },
  call: async (input, context) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const linkedSignal = linkAbortSignals(context.abortSignal, controller.signal);
    try {
      const response = await fetch(input.url, { signal: linkedSignal });
      if (!response.ok) {
        return `HTTP ${response.status} ${response.statusText}`;
      }
      const contentType = response.headers.get("content-type") ?? "";
      const raw = await response.text();
      const text = contentType.includes("html") ? htmlToText(raw) : raw.trim();
      const limit = input.max_chars ?? 20000;
      return text.length <= limit ? text : `${text.slice(0, limit)}\n...[truncated]`;
    } finally {
      clearTimeout(timeout);
    }
  },
});

const linkAbortSignals = (primary: AbortSignal, secondary: AbortSignal): AbortSignal => {
  if (primary.aborted) {
    return primary;
  }
  const controller = new AbortController();
  const abort = (): void => controller.abort();
  primary.addEventListener("abort", abort);
  secondary.addEventListener("abort", abort);
  return controller.signal;
};
