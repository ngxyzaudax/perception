export type ParsedTaskNotification = {
  agentId?: string;
  agentName?: string;
  status?: string;
  summary?: string;
  result?: string;
};

const extractTag = (content: string, tag: string): string | undefined => {
  const match = content.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return match?.[1]?.trim();
};

export const isTaskNotification = (content: string): boolean =>
  content.trimStart().startsWith("<task-notification>");

export const parseTaskNotification = (content: string): ParsedTaskNotification => ({
  agentId: extractTag(content, "task-id"),
  agentName: extractTag(content, "agent-name"),
  status: extractTag(content, "status"),
  summary: extractTag(content, "summary"),
  result: extractTag(content, "result"),
});
