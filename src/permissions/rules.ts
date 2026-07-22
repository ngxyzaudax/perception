export const matchesRule = (rule: string, toolName: string, summary: string): boolean => {
  const parsed = parseRule(rule);
  if (!parsed) {
    return false;
  }
  if (parsed.toolName !== toolName) {
    return false;
  }
  if (!parsed.pattern) {
    return true;
  }
  return wildcardMatch(parsed.pattern, summary);
};

export const anyRuleMatches = (
  rules: string[],
  toolName: string,
  summary: string,
): boolean => rules.some((rule) => matchesRule(rule, toolName, summary));

const parseRule = (rule: string): { toolName: string; pattern?: string } | null => {
  const match = rule.match(/^([A-Za-z][A-Za-z0-9_]*)(?:\((.+)\))?$/);
  if (!match) {
    return null;
  }
  return { toolName: match[1], pattern: match[2] };
};

const wildcardMatch = (pattern: string, value: string): boolean => {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`).test(value);
};
