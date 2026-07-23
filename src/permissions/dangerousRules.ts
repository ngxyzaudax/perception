const DANGEROUS_BASH_PREFIXES = [
  "rm",
  "rmdir",
  "dd",
  "mkfs",
  "shutdown",
  "reboot",
  "chmod",
  "chown",
  "curl",
  "wget",
  "bash",
  "sh",
  "zsh",
  "python",
  "perl",
  "ruby",
  "node",
];

export const isDangerousPersistRule = (rule: string): boolean => {
  if (/^[A-Za-z][A-Za-z0-9_]*$/.test(rule)) {
    return true;
  }
  const match = rule.match(/^([A-Za-z][A-Za-z0-9_]*)\((.+)\)$/);
  if (!match) {
    return true;
  }
  const toolName = match[1]!;
  const pattern = match[2]!;
  if (pattern === "*" || pattern === "**") {
    return true;
  }
  if (toolName === "Bash") {
    return isDangerousBashPattern(pattern);
  }
  return false;
};

const isDangerousBashPattern = (pattern: string): boolean => {
  const command = pattern.replace(/\*$/, "").trim();
  if (command.length === 0) {
    return true;
  }
  const firstWord = command.split(/\s+/)[0]?.toLowerCase() ?? "";
  return DANGEROUS_BASH_PREFIXES.includes(firstWord);
};

export const sanitizePersistRule = (rule: string): string | null =>
  isDangerousPersistRule(rule) ? null : rule;
