import { SelectList } from "./select/SelectList.js";
import type { QuestionOption } from "../types/questions.js";
import { colors } from "../ui/theme.js";

type QuestionPromptProps = {
  question: string;
  options: QuestionOption[];
  onResolve: (answer: string) => void;
  onCancel: () => void;
};

export const QuestionPrompt = ({
  question,
  options,
  onResolve,
  onCancel,
}: QuestionPromptProps): React.ReactElement => {
  const selectOptions = options.map((option) => ({
    label: option.label,
    value: option.label,
    description: option.description,
  }));
  return (
    <SelectList
      title={question}
      borderColor={colors.accent}
      options={selectOptions}
      onSelect={onResolve}
      onCancel={onCancel}
    />
  );
};
