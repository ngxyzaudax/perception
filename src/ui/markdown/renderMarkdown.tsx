import { Box } from "ink";
import type { ReactElement } from "react";
import { renderBlocks } from "./renderBlock.js";
import { tokenizeMarkdown } from "./renderInline.js";

export const renderMarkdown = (source: string): ReactElement => {
  const blocks = tokenizeMarkdown(source);
  return (
    <Box flexDirection="column">
      {renderBlocks(blocks)}
    </Box>
  );
};
