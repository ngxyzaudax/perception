import type { DisplayMessage } from "../../types/displayMessages.js";
import { isStatusMessage } from "../../types/displayMessages.js";
import { isEmptyAssistantContent } from "../../query/emptyAssistantTurn.js";
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
    if (isEmptyAssistantContent(message.content)) {
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
        collapsed={collapsed}
      />
    );
  }
  return null;
};
