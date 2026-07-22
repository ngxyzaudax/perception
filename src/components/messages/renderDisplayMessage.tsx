import type { DisplayMessage } from "../../types/displayMessages.js";
import { isStatusMessage } from "../../types/displayMessages.js";
import { AssistantMessage } from "./AssistantMessage.js";
import { StatusMessage } from "./StatusMessage.js";
import { ToolMessage } from "./ToolMessage.js";
import { UserMessage } from "./UserMessage.js";

export const renderDisplayMessage = (
  message: DisplayMessage,
  index: number,
): React.ReactElement | null => {
  if (isStatusMessage(message)) {
    return <StatusMessage key={`status-${index}`} content={message.content} title={message.title} />;
  }
  if (message.role === "user") {
    return <UserMessage key={`user-${index}`} content={message.content} />;
  }
  if (message.role === "assistant") {
    if (message.content.trim().length === 0) {
      return null;
    }
    return <AssistantMessage key={`assistant-${index}`} content={message.content} />;
  }
  if (message.role === "tool") {
    return (
      <ToolMessage
        key={`tool-${index}`}
        name={message.name}
        summary={message.summary}
        content={message.content}
        display={message.display}
        isError={message.isError}
      />
    );
  }
  return null;
};
