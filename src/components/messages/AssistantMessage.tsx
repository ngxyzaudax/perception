import { Box, Text } from "ink";
import { colors, symbols } from "../../ui/theme.js";
import { renderMarkdown } from "../../ui/markdown/renderMarkdown.js";

type AssistantMessageProps = {
  content: string;
};

export const AssistantMessage = ({ content }: AssistantMessageProps): React.ReactElement => (
  <Box flexDirection="column" marginTop={1}>
    <Text color={colors.assistant}>
      {symbols.bullet} assistant
    </Text>
    {renderMarkdown(content)}
  </Box>
);
