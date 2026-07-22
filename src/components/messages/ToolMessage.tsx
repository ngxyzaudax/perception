import { Box, Text } from "ink";
import { DiffView } from "../DiffView.js";
import { colors, symbols } from "../../ui/theme.js";
import { compactToolOutput } from "../../utils/toolDisplay.js";
import type { ToolMessageDisplay } from "../../types/messages.js";

type ToolMessageProps = {
  name: string;
  summary?: string;
  content: string;
  display?: ToolMessageDisplay;
  isError?: boolean;
};

export const ToolMessage = ({
  name,
  summary,
  content,
  display,
  isError,
}: ToolMessageProps): React.ReactElement => {
  const compact = compactToolOutput(content, 6);
  const bulletColor = isError ? colors.error : colors.tool;
  const bullet = isError ? symbols.cross : symbols.bullet;
  return (
    <Box flexDirection="column" marginTop={1}>
      <Text>
        <Text color={bulletColor}>{bullet} </Text>
        <Text bold color={bulletColor}>
          {name}
        </Text>
        {summary ? <Text dimColor>({summary})</Text> : null}
      </Text>
      <Box paddingLeft={2}>
        <Text color={colors.dim}>{symbols.branch} </Text>
        {display?.kind === "diff" ? (
          <DiffView preview={display} maxLines={12} filePath={display.filePath} />
        ) : (
          <Text wrap="wrap" color={isError ? colors.error : undefined}>
            {compact.preview}
          </Text>
        )}
      </Box>
      {compact.hiddenLines > 0 ? (
        <Box paddingLeft={2}>
          <Text dimColor>... (+{compact.hiddenLines} more lines)</Text>
        </Box>
      ) : null}
    </Box>
  );
};
