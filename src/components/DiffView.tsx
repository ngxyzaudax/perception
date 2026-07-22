import { Box, Text } from "ink";
import { buildLineDiff, trimDiffLines, type DiffPreview } from "../utils/diffLines.js";
import { colors } from "../ui/theme.js";

type DiffViewProps = {
  preview: DiffPreview;
  maxLines?: number;
  filePath?: string;
};

export const DiffView = ({
  preview,
  maxLines = 24,
  filePath,
}: DiffViewProps): React.ReactElement => {
  const allLines = trimDiffLines(buildLineDiff(preview.oldContent, preview.newContent));
  const hiddenCount = Math.max(0, allLines.length - maxLines);
  const lines = allLines.slice(0, maxLines);
  const startLine = 1;
  return (
    <Box flexDirection="column">
      {filePath ? (
        <Text dimColor>{filePath}</Text>
      ) : null}
      {lines.map((line, index) => {
        const lineNumber = startLine + index;
        const prefix = line.type === "add" ? "+ " : line.type === "remove" ? "- " : "  ";
        const lineColor =
          line.type === "add"
            ? colors.diffAdd
            : line.type === "remove"
              ? colors.diffRemove
              : colors.diffContext;
        return (
          <Text key={`${index}-${line.type}`} color={lineColor} dimColor={line.type === "context"}>
            <Text dimColor>{String(lineNumber).padStart(4, " ")} </Text>
            {prefix}
            {line.text}
          </Text>
        );
      })}
      {hiddenCount > 0 ? (
        <Text dimColor>... +{hiddenCount} lines</Text>
      ) : null}
    </Box>
  );
};
