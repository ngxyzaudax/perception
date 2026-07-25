import { Text } from "ink";
import { colors } from "../../ui/theme.js";
import type { HistorySearchState } from "./useHistorySearch.js";

type InputFooterProps = {
  searchState: HistorySearchState;
  queuedInputs: string[];
  queueMode: boolean;
};

export const InputFooter = ({
  searchState,
  queuedInputs,
  queueMode,
}: InputFooterProps): React.ReactElement => (
  <>
    {searchState.active ? (
      <Text>
        <Text color={colors.highlight}>(reverse-search)</Text> {searchState.query}
        <Text dimColor>: {searchState.match ?? "no match"}</Text>
      </Text>
    ) : null}
    {queuedInputs.map((queued, index) => (
      <Text key={`${queued}-${index}`} dimColor>
        queued: {queued}
      </Text>
    ))}
    <Text dimColor>
      {queueMode
        ? "esc interrupt | enter queue | ctrl+c ctrl+c exit"
        : "esc esc clear | ctrl+r search | ctrl+c ctrl+c exit"}
    </Text>
  </>
);
