import { Box, Text } from "ink";
import type { ReactElement } from "react";
import { colors } from "../theme.js";
import { highlightCode, renderInline } from "./renderInline.js";

type BlockToken = {
  type: string;
  text?: string;
  lang?: string;
  depth?: number;
  items?: Array<{ text: string }>;
  tokens?: BlockToken[];
  raw?: string;
};

export const renderBlock = (block: BlockToken): ReactElement => {
  if (block.type === "heading") {
    const depth = block.depth ?? 1;
    const prefix = "#".repeat(depth);
    return (
      <Box marginTop={1}>
        <Text bold color={colors.assistant}>
          {prefix} {block.text}
        </Text>
      </Box>
    );
  }
  if (block.type === "paragraph") {
    return (
      <Box marginTop={0}>
        {renderInline(block.text ?? "")}
      </Box>
    );
  }
  if (block.type === "code") {
    return (
      <Box flexDirection="column" marginTop={1}>
        {block.lang ? (
          <Text dimColor>{block.lang}</Text>
        ) : null}
        <Text wrap="wrap">{highlightCode(block.text ?? "", block.lang)}</Text>
      </Box>
    );
  }
  if (block.type === "list") {
    return (
      <Box flexDirection="column" marginTop={0}>
        {(block.items ?? []).map((item, index) => (
          <Box key={index}>
            <Text>{"  "}• </Text>
            {renderInline(item.text)}
          </Box>
        ))}
      </Box>
    );
  }
  if (block.type === "blockquote") {
    return (
      <Box flexDirection="column" marginTop={0} paddingLeft={1}>
        {(block.tokens ?? []).map((inner, index) => (
          <Box key={index}>
            <Text color={colors.dim}>│ </Text>
            {renderBlock(inner)}
          </Box>
        ))}
      </Box>
    );
  }
  if (block.type === "space") {
    return <Text> </Text>;
  }
  return (
    <Box marginTop={0}>
      <Text wrap="wrap">{block.raw ?? block.text ?? ""}</Text>
    </Box>
  );
};

export const renderBlocks = (blocks: BlockToken[]): ReactElement => (
  <Box flexDirection="column">
    {blocks.map((block, index) => (
      <Box key={index}>{renderBlock(block)}</Box>
    ))}
  </Box>
);
