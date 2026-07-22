import { SelectList } from "./select/SelectList.js";
import { colors } from "../ui/theme.js";

type QuestionPromptProps = {
  question: string;
  options: string[];
  onResolve: (answer: string) => void;
};

export const QuestionPrompt = ({
  question,
  options,
  onResolve,
}: QuestionPromptProps): React.ReactElement => {
  const selectOptions = options.map((option) => ({
    label: option,
    value: option,
  }));
  return (
    <SelectList
      title={question}
      borderColor={colors.accent}
      options={selectOptions}
      onSelect={onResolve}
    />
  );
};
