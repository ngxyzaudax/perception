import { Box, Text } from "ink";
import { colors, symbols } from "../../ui/theme.js";
import { parseTaskNotification } from "../../state/parseTaskNotification.js";

type NotificationMessageProps = {
  content: string;
};

const RESULT_PREVIEW_CHARS = 600;

const previewResult = (result: string): string =>
  result.length <= RESULT_PREVIEW_CHARS
    ? result
    : `${result.slice(0, RESULT_PREVIEW_CHARS)}\n[result truncated for display]`;

const headingColor = (status?: string): string =>
  status === "failed" ? colors.error : colors.accent;

export const NotificationMessage = ({ content }: NotificationMessageProps): React.ReactElement => {
  const parsed = parseTaskNotification(content);
  const label = parsed.agentName ?? parsed.agentId ?? "agent";
  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color={headingColor(parsed.status)}>
        {symbols.bullet} Agent({label}) {parsed.status ?? ""}
      </Text>
      {parsed.summary ? (
        <Text wrap="wrap" color={colors.dim}>
          {symbols.branch} {parsed.summary}
        </Text>
      ) : null}
      {parsed.result ? (
        <Text wrap="wrap" dimColor>
          {previewResult(parsed.result)}
        </Text>
      ) : null}
    </Box>
  );
};
