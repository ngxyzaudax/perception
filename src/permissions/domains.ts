import { anyRuleMatches } from "./rules.js";

export const domainFromUrl = (url: string): string | null => {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
};

export const isDomainAllowed = (domain: string, allowedDomains: string[]): boolean => {
  const normalized = domain.toLowerCase();
  return allowedDomains.some((entry) => {
    const pattern = entry.toLowerCase().trim();
    if (pattern.startsWith("*.")) {
      const suffix = pattern.slice(1);
      return normalized.endsWith(suffix) || normalized === pattern.slice(2);
    }
    return normalized === pattern;
  });
};

export const matchesWebFetchAllowRule = (
  rules: string[],
  url: string,
): boolean => {
  const domain = domainFromUrl(url);
  if (!domain) {
    return false;
  }
  return anyRuleMatches(rules, "WebFetch", url) || anyRuleMatches(rules, "WebFetch", domain);
};
