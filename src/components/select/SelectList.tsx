import { Box, Text, useInput } from "ink";
import { useState } from "react";
import { colors } from "../../ui/theme.js";

export type SelectOption<T> = {
  label: string;
  value: T;
  description?: string;
};

type SelectListProps<T> = {
  title: string;
  options: SelectOption<T>[];
  borderColor?: string;
  onSelect: (value: T) => void;
  onCancel?: () => void;
};

export const SelectList = <T,>({
  title,
  options,
  borderColor = colors.highlight,
  onSelect,
  onCancel,
}: SelectListProps<T>): React.ReactElement => {
  const [index, setIndex] = useState(0);
  const selected = options[index];

  useInput((input, key) => {
    if (key.escape && onCancel) {
      onCancel();
      return;
    }
    if (key.upArrow || input === "k") {
      setIndex((current) => (current === 0 ? options.length - 1 : current - 1));
      return;
    }
    if (key.downArrow || input === "j") {
      setIndex((current) => (current === options.length - 1 ? 0 : current + 1));
      return;
    }
    if (key.return && selected) {
      onSelect(selected.value);
    }
  });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={borderColor} paddingX={1}>
      <Text color={borderColor}>{title}</Text>
      {options.map((option, optionIndex) => (
        <Box key={option.label} flexDirection="column">
          <Text color={optionIndex === index ? colors.success : undefined}>
            {optionIndex === index ? "> " : "  "}
            {option.label}
          </Text>
          {option.description && optionIndex === index ? (
            <Text dimColor>  {option.description}</Text>
          ) : null}
        </Box>
      ))}
      <Text dimColor>↑↓ navigate, Enter select{onCancel ? ", Esc cancel" : ""}</Text>
    </Box>
  );
};
