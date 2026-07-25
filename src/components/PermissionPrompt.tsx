import { Box, Text } from "ink";
import { USER_PERMISSION_DENIED } from "../permissions/permissionMessages.js";
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
  onCancel: () => void;
};

export const PermissionPrompt = ({
  toolName,
  summary,
  preview,
  suggestedPersistRule,
  onResolve,
  onCancel,
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
      label: "No — I'll tell the agent what to do instead",
      value: { granted: false, reason: USER_PERMISSION_DENIED } as PermissionResult,
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
        onCancel={onCancel}
      />
    </Box>
  );
};
