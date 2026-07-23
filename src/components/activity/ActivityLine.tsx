import { Box, Text } from "ink";
import { formatDuration } from "../../ui/formatDuration.js";
import { spinnerVerb } from "../../screens/spinnerMode.js";
import type { SpinnerMode } from "../../screens/spinnerMode.js";
import { Spinner } from "./Spinner.js";

type ActivityLineProps = {
  isActive: boolean;
  elapsedSeconds: number;
  completionTokens: number;
  status: string;
  queuedCount: number;
  mode?: SpinnerMode;
};

export const ActivityLine = ({
  isActive,
  elapsedSeconds,
  completionTokens,
  status,
  queuedCount,
  mode = "thinking",
}: ActivityLineProps): React.ReactElement | null => {
  if (!isActive) {
    return null;
  }
  const verb = spinnerVerb(mode);
  return (
    <Box marginTop={1}>
      <Spinner
        label={`${verb} ${formatDuration(elapsedSeconds)} | ${completionTokens} tok | esc to interrupt`}
      />
      {status.length > 0 ? (
        <Text dimColor> | {status}</Text>
      ) : null}
      {queuedCount > 0 ? (
        <Text dimColor> | queued: {queuedCount}</Text>
      ) : null}
    </Box>
  );
};
