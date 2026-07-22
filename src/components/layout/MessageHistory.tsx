import { Box, Static } from "ink";
import { useRef } from "react";
import type { DisplayMessage } from "../../types/displayMessages.js";
import { renderDisplayMessage } from "../messages/renderDisplayMessage.js";

type MessageHistoryProps = {
  banner: React.ReactNode;
  messages: DisplayMessage[];
};

const isAppendOnlyChange = (previous: DisplayMessage[], next: DisplayMessage[]): boolean =>
  previous.length <= next.length && previous.every((message, index) => message === next[index]);

const clearTerminal = (): void => {
  process.stdout.write("\x1b[2J\x1b[3J\x1b[H");
};

const useStaticGeneration = (messages: DisplayMessage[]): number => {
  const previousRef = useRef<DisplayMessage[]>([]);
  const generationRef = useRef(0);
  if (!isAppendOnlyChange(previousRef.current, messages)) {
    generationRef.current += 1;
    clearTerminal();
  }
  previousRef.current = messages;
  return generationRef.current;
};

type StaticItem =
  | { kind: "banner" }
  | { kind: "message"; message: DisplayMessage };

const buildItems = (messages: DisplayMessage[]): StaticItem[] => [
  { kind: "banner" },
  ...messages.map((message): StaticItem => ({ kind: "message", message })),
];

export const MessageHistory = ({ banner, messages }: MessageHistoryProps): React.ReactElement => {
  const generation = useStaticGeneration(messages);
  return (
    <Static key={`history-${generation}`} items={buildItems(messages)}>
      {(item, index) =>
        item.kind === "banner" ? (
          <Box key="banner">{banner}</Box>
        ) : (
          renderDisplayMessage(item.message, index) ?? <Box key={`empty-${index}`} />
        )
      }
    </Static>
  );
};
