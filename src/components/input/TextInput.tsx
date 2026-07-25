import { Box, Text } from "ink";
import { useState } from "react";
import { colors, symbols } from "../../ui/theme.js";
import { InputFooter } from "./InputFooter.js";
import { SuggestionMenu } from "./SuggestionMenu.js";
import { useInputHistory } from "./useInputHistory.js";
import { useHistorySearch } from "./useHistorySearch.js";
import { useInputKeys } from "./useInputKeys.js";
import { createBuffer, replaceBuffer, type TextBuffer } from "./useTextBuffer.js";
import { useSuggestions, type SuggestionState } from "./useSuggestions.js";

type TextInputProps = {
  disabled: boolean;
  queueMode: boolean;
  queuedInputs: string[];
  onSubmit: (value: string) => void;
  onQueue: (value: string) => void;
  onExitRequest: () => void;
  onInterrupt: () => void;
};

const placeholderText = "message | / commands | @ files | \\ + enter for newline";

export const TextInput = ({
  disabled,
  queueMode,
  queuedInputs,
  onSubmit,
  onQueue,
  onExitRequest,
  onInterrupt,
}: TextInputProps): React.ReactElement => {
  const [buffer, setBuffer] = useState<TextBuffer>(createBuffer());
  const [suggestionOverride, setSuggestionOverride] = useState<SuggestionState | null>(null);
  const history = useInputHistory();
  const search = useHistorySearch(history.history, (entry) =>
    setBuffer(replaceBuffer(createBuffer(), entry)),
  );
  const suggestions = useSuggestions(buffer);
  const activeSuggestions = suggestionOverride ?? suggestions;

  useInputKeys({
    disabled,
    queueMode,
    buffer,
    setBuffer,
    activeSuggestions,
    setSuggestionOverride,
    history,
    search,
    onSubmit,
    onQueue,
    onExitRequest,
    onInterrupt,
  });

  const renderValue = (): React.ReactElement => {
    if (disabled && !queueMode) {
      return <Text dimColor>...</Text>;
    }
    if (buffer.text.length === 0) {
      return (
        <Text>
          {"\u2588"}
          <Text dimColor> {placeholderText}</Text>
        </Text>
      );
    }
    const before = buffer.text.slice(0, buffer.cursor);
    const after = buffer.text.slice(buffer.cursor);
    return <Text>{`${before}\u2588${after}`}</Text>;
  };

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box borderStyle="round" borderColor={colors.border} paddingX={1}>
        <Text color={colors.accent}>{symbols.prompt} </Text>
        {renderValue()}
      </Box>
      <SuggestionMenu suggestions={activeSuggestions} />
      <InputFooter
        searchState={search.state}
        queuedInputs={queuedInputs}
        queueMode={queueMode}
      />
    </Box>
  );
};
