import { Box, Text } from "ink";
import { colors, symbols } from "../../ui/theme.js";
import { clampToTailRows } from "../../ui/clampText.js";

const STREAM_TAIL_ROWS = 8;
const THINKING_TAIL_ROWS = 4;
const LIVE_REGION_ROWS = 1 + STREAM_TAIL_ROWS;

type LiveRegionProps = {
  thinkingText: string;
  streamingText: string;
  toolPreview?: string;
};

export const LiveRegion = ({
  thinkingText,
  streamingText,
  toolPreview = "",
}: LiveRegionProps): React.ReactElement | null => {
  if (thinkingText.length === 0 && streamingText.length === 0 && toolPreview.length === 0) {
    return null;
  }
  const showThinking = thinkingText.length > 0;
  const showStreaming = streamingText.length > 0;
  const thinking = clampToTailRows(thinkingText, THINKING_TAIL_ROWS);
  const streaming = clampToTailRows(streamingText, STREAM_TAIL_ROWS);
  return (
    <Box
      flexDirection="column"
      marginTop={1}
      height={LIVE_REGION_ROWS + (toolPreview.length > 0 ? 1 : 0)}
      flexShrink={0}
    >
      {showThinking ? (
        <Box flexDirection="column" height={showStreaming ? THINKING_TAIL_ROWS : LIVE_REGION_ROWS - 1}>
          <Text dimColor>thinking</Text>
          <Text dimColor wrap="wrap">
            {thinking.visible}
          </Text>
        </Box>
      ) : null}
      {showStreaming ? (
        <Box flexDirection="column" height={showThinking ? STREAM_TAIL_ROWS : LIVE_REGION_ROWS - 1}>
          <Text color={colors.assistant}>
            {symbols.bullet} assistant{" "}
            {streaming.truncated ? <Text dimColor>(streaming, full text on completion)</Text> : null}
          </Text>
          <Text wrap="wrap">{streaming.visible}</Text>
        </Box>
      ) : null}
      {toolPreview.length > 0 ? (
        <Box height={1}>
          <Text dimColor wrap="truncate-end">
            {symbols.bullet} preparing {toolPreview}
          </Text>
        </Box>
      ) : null}
    </Box>
  );
};
