import { Box, Text } from "ink";
import { colors } from "../../ui/theme.js";

type StatusMessageProps = {
  content: string;
  title?: string;
};

export const StatusMessage = ({ content, title }: StatusMessageProps): React.ReactElement => (
  <Box
    flexDirection="column"
    marginTop={1}
    borderStyle="round"
    borderColor={colors.status}
    paddingX={1}
  >
    {title ? (
      <Text bold color={colors.status}>
        {title}
      </Text>
    ) : null}
    <Text wrap="wrap">{content}</Text>
  </Box>
);
