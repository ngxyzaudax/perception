import { Box, Text } from "ink";
import { colors, symbols } from "../../ui/theme.js";

type UserMessageProps = {
  content: string;
};

export const UserMessage = ({ content }: UserMessageProps): React.ReactElement => (
  <Box flexDirection="column" marginTop={1}>
    <Text color={colors.user}>
      {symbols.prompt} you
    </Text>
    <Text wrap="wrap">{content}</Text>
  </Box>
);
