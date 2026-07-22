export type SlashCommandDefinition = {
  name: string;
  description: string;
};

export const slashCommands: SlashCommandDefinition[] = [
  { name: "/exit", description: "Exit perception" },
  { name: "/clear", description: "Clear conversation" },
  { name: "/model", description: "Show current model" },
  { name: "/tokens", description: "Show token usage" },
  { name: "/permissions", description: "Set permission mode" },
  { name: "/resume", description: "Resume a saved session" },
  { name: "/memory", description: "Show project memory" },
  { name: "/compact", description: "Compact conversation history" },
  { name: "/mcp", description: "Show MCP server status" },
  { name: "/help", description: "Show available commands" },
  { name: "/doctor", description: "Run diagnostics" },
  { name: "/config", description: "View or update config" },
  { name: "/plan", description: "Enter plan mode" },
  { name: "/plan-approve", description: "Approve current plan" },
  { name: "/tasks", description: "Show background tasks" },
  { name: "/agents", description: "List loaded agents" },
  { name: "/diff", description: "Show git diff" },
  { name: "/context", description: "Show context report" },
  { name: "/rewind", description: "Rewind to checkpoint" },
  { name: "/init", description: "Initialize project memory" },
  { name: "/export", description: "Export conversation" },
  { name: "/branch", description: "Branch current session" },
  { name: "/coordinator", description: "Toggle coordinator mode" },
  { name: "/commit", description: "Create a git commit from current changes" },
  { name: "/review", description: "Review current code changes" },
];

export const filterSlashCommands = (input: string): SlashCommandDefinition[] => {
  if (!input.startsWith("/")) {
    return [];
  }
  const query = input.toLowerCase();
  return slashCommands.filter((command) => command.name.startsWith(query));
};
