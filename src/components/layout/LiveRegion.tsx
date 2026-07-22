import { Box, Text } from "ink";
import { colors, symbols } from "../../ui/theme.js";
import { clampToTailRows } from "../../ui/clampText.js";

const streamTailRows = (): number => Math.max(4, Math.min(12, (process.stdout.rows ?? 24) - 12));
const thinkingTailRows = 3;

type LiveRegionProps = {
  thinkingText: string;
  streamingText: string;
};

export const LiveRegion = ({
  thinkingText,
  streamingText,
}: LiveRegionProps): React.ReactElement | null => {
  if (thinkingText.length === 0 && streamingText.length === 0) {
    return null;
  }
  const thinking = clampToTailRows(thinkingText, thinkingTailRows);
  const streaming = clampToTailRows(streamingText, streamTailRows());
  return (
    <Box flexDirection="column" marginTop={1}>
      {thinkingText.length > 0 && streamingText.length === 0 ? (
        <Box flexDirection="column">
          <Text dimColor>thinking</Text>
          <Text dimColor wrap="wrap">
            {thinking.visible}
          </Text>
        </Box>
      ) : null}
      {streamingText.length > 0 ? (
        <Box flexDirection="column">
          <Text color={colors.assistant}>
            {symbols.bullet} assistant{" "}
            {streaming.truncated ? <Text dimColor>(streaming, full text on completion)</Text> : null}
          </Text>
          <Text wrap="wrap">{streaming.visible}</Text>
        </Box>
      ) : null}
    </Box>
  );
};
