import { z } from "zod";

const toolCallSchema = z.object({
  id: z.string(),
  name: z.string(),
  arguments: z.string(),
});

const chatMessageSchema = z.discriminatedUnion("role", [
  z.object({ role: z.literal("system"), content: z.string() }),
  z.object({ role: z.literal("user"), content: z.string() }),
  z.object({
    role: z.literal("assistant"),
    content: z.string(),
    toolCalls: z.array(toolCallSchema).optional(),
  }),
  z.object({
    role: z.literal("tool"),
    toolCallId: z.string(),
    content: z.string(),
    name: z.string(),
  }),
]);

export const sessionSchema = z.object({
  id: z.string(),
  title: z.string(),
  cwd: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  messages: z.array(chatMessageSchema),
});

export type StoredSession = z.infer<typeof sessionSchema>;

export type SessionMetadata = {
  id: string;
  title: string;
  cwd: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
};

export const toSessionMetadata = (session: StoredSession): SessionMetadata => ({
  id: session.id,
  title: session.title,
  cwd: session.cwd,
  createdAt: session.createdAt,
  updatedAt: session.updatedAt,
  messageCount: session.messages.length,
});

export const deriveSessionTitle = (messages: StoredSession["messages"]): string => {
  const firstUser = messages.find((message) => message.role === "user");
  if (!firstUser || firstUser.role !== "user") {
    return "Untitled session";
  }
  const trimmed = firstUser.content.trim().replace(/\s+/g, " ");
  return trimmed.length <= 60 ? trimmed : `${trimmed.slice(0, 57)}...`;
};
