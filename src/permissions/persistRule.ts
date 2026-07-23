import { sanitizePersistRule } from "./dangerousRules.js";

export const suggestPersistRule = (toolName: string, summary: string): string | null => {
  if (toolName === "Bash") {
    return sanitizePersistRule(bashPrefixRule(summary));
  }
  if (toolName === "WebFetch") {
    return sanitizePersistRule(webFetchDomainRule(summary));
  }
  if (toolName === "Edit" || toolName === "Write" || toolName === "Read") {
    return sanitizePersistRule(`${toolName}(${escapePattern(summary)})`);
  }
  return sanitizePersistRule(`${toolName}(${escapePattern(summary)})`);
};

const bashPrefixRule = (command: string): string => {
  const trimmed = command.trim();
  const first = trimmed.split(/\s+/)[0] ?? trimmed;
  if (first.length === 0) {
    return "Bash";
  }
  return `Bash(${escapePattern(first)} *)`;
};

const webFetchDomainRule = (urlOrHost: string): string => {
  try {
    const host = urlOrHost.includes("://") ? new URL(urlOrHost).hostname : urlOrHost;
    return `WebFetch(${escapePattern(host)}*)`;
  } catch {
    return `WebFetch(${escapePattern(urlOrHost)})`;
  }
};

const escapePattern = (value: string): string =>
  value.replace(/[()]/g, "");
