import { Box, Text, useInput } from "ink";
import { useRef, useState } from "react";
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
  const indexRef = useRef(0);
  indexRef.current = index;
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  useInput((input, key) => {
    if (key.escape && onCancelRef.current) {
      onCancelRef.current();
      return;
    }
    const count = optionsRef.current.length;
    if (count === 0) {
      return;
    }
    if (key.upArrow || input === "k") {
      setIndex((current) => (current === 0 ? count - 1 : current - 1));
      return;
    }
    if (key.downArrow || input === "j") {
      setIndex((current) => (current === count - 1 ? 0 : current + 1));
      return;
    }
    if (key.return) {
      const selected = optionsRef.current[indexRef.current];
      if (selected) {
        onSelectRef.current(selected.value);
      }
    }
  });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={borderColor} paddingX={1}>
      <Text color={borderColor}>{title}</Text>
      {options.map((option, optionIndex) => (
        <Box key={`${optionIndex}:${option.label}`} flexDirection="column">
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
