import type { DisplayMessage } from "../../types/displayMessages.js";
import { isStatusMessage } from "../../types/displayMessages.js";
import { isTaskNotification } from "../../state/parseTaskNotification.js";
import { AssistantMessage } from "./AssistantMessage.js";
import { NotificationMessage } from "./NotificationMessage.js";
import { StatusMessage } from "./StatusMessage.js";
import { ToolMessage } from "./ToolMessage.js";
import { UserMessage } from "./UserMessage.js";

export const renderDisplayMessage = (
  message: DisplayMessage,
  index: number,
  collapsed?: boolean,
): React.ReactElement | null => {
  if (isStatusMessage(message)) {
    return <StatusMessage key={`status-${index}`} content={message.content} title={message.title} />;
  }
  if (message.role === "user") {
    if (isTaskNotification(message.content)) {
      return <NotificationMessage key={`notification-${index}`} content={message.content} />;
    }
    return <UserMessage key={`user-${index}`} content={message.content} />;
  }
  if (message.role === "assistant") {
    if (message.content.trim().length === 0) {
      if (message.toolCalls && message.toolCalls.length > 0) {
        return null;
      }
      return <StatusMessage key={`assistant-${index}`} content="Model returned an empty response." title="Notice" />;
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
        collapsed={collapsed}
      />
    );
  }
  return null;
};
