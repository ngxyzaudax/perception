import { Box, Text } from "ink";
import type { PermissionResult } from "../types/permissions.js";
import type { DiffPreview } from "../utils/diffLines.js";
import { colors } from "../ui/theme.js";
import { DiffView } from "./DiffView.js";
import { SelectList } from "./select/SelectList.js";

type PermissionPromptProps = {
  toolName: string;
  summary: string;
  preview?: DiffPreview;
  suggestedPersistRule?: string;
  onResolve: (result: PermissionResult) => void;
};

export const PermissionPrompt = ({
  toolName,
  summary,
  preview,
  suggestedPersistRule,
  onResolve,
}: PermissionPromptProps): React.ReactElement => {
  const persistLabel = suggestedPersistRule
    ? `Yes, always allow ${suggestedPersistRule}`
    : `Yes, always allow ${toolName}`;
  const options = [
    { label: "Yes", value: { granted: true } as PermissionResult },
    {
      label: persistLabel,
      value: {
        granted: true,
        persistRule: suggestedPersistRule,
      } as PermissionResult,
    },
    {
      label: "No, tell the agent what to do differently",
      value: { granted: false, reason: "user denied permission" } as PermissionResult,
    },
  ];
  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color={colors.warning}>
          Allow {toolName}: {summary}
        </Text>
        {preview ? <DiffView preview={preview} /> : null}
      </Box>
      <SelectList
        title="Permission required"
        borderColor={colors.warning}
        options={options}
        onSelect={onResolve}
      />
    </Box>
  );
};
