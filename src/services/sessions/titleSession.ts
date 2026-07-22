import type { Settings } from "../../schemas/settings.js";
import { createLlmClient, resolveModelId } from "../llm/client.js";
import type { ChatMessage } from "../../types/messages.js";

export const titleSession = async (
  settings: Settings,
  messages: ChatMessage[],
): Promise<string | null> => {
  const userMessages = messages.filter((message) => message.role === "user");
  if (userMessages.length < 2) {
    return null;
  }
  const excerpt = userMessages
    .slice(0, 3)
    .map((message) => message.content)
    .join("\n")
    .slice(0, 2000);
  try {
    const client = createLlmClient(settings);
    const model = await resolveModelId(client, settings.model);
    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "user",
          content: `Title this conversation in 6 words or fewer:\n${excerpt}`,
        },
      ],
      max_tokens: 24,
    });
    const title = response.choices[0]?.message?.content?.trim();
    return title && title.length > 0 ? title : null;
  } catch {
    return null;
  }
};
