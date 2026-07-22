import { Box, Text } from "ink";
import { colors } from "../../ui/theme.js";
import type { SuggestionState } from "./useSuggestions.js";

const maxVisibleSuggestions = 8;

const windowBounds = (selectedIndex: number, total: number): { start: number; end: number } => {
  const start = Math.max(
    0,
    Math.min(selectedIndex - Math.floor(maxVisibleSuggestions / 2), total - maxVisibleSuggestions),
  );
  return { start, end: Math.min(total, start + maxVisibleSuggestions) };
};

type SuggestionMenuProps = {
  suggestions: SuggestionState;
};

export const SuggestionMenu = ({ suggestions }: SuggestionMenuProps): React.ReactElement | null => {
  if (suggestions.kind === "none") {
    return null;
  }
  const labels =
    suggestions.kind === "slash"
      ? suggestions.slashCommands.map((command) => ({
          key: command.name,
          text: `${command.name} - ${command.description}`,
        }))
      : suggestions.fileSuggestions.map((file) => ({ key: file.path, text: `@${file.path}` }));
  const { start, end } = windowBounds(suggestions.selectedIndex, labels.length);
  return (
    <Box flexDirection="column" marginTop={1}>
      {labels.slice(start, end).map((label, offset) => {
        const index = start + offset;
        const selected = index === suggestions.selectedIndex;
        return (
          <Text key={label.key} color={selected ? colors.highlight : undefined} dimColor={!selected}>
            {selected ? "> " : "  "}
            {label.text}
          </Text>
        );
      })}
      {labels.length > end ? <Text dimColor>  ... +{labels.length - end} more (tab to complete)</Text> : null}
    </Box>
  );
};
