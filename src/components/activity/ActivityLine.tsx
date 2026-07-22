import { Box, Text } from "ink";
import { formatDuration } from "../../ui/formatDuration.js";
import { Spinner } from "./Spinner.js";

const activityVerbs = ["Thinking", "Working", "Processing"] as const;

type ActivityLineProps = {
  busy: boolean;
  elapsedSeconds: number;
  completionTokens: number;
  status: string;
  queuedCount: number;
};

export const ActivityLine = ({
  busy,
  elapsedSeconds,
  completionTokens,
  status,
  queuedCount,
}: ActivityLineProps): React.ReactElement | null => {
  if (!busy) {
    return null;
  }
  const verb = activityVerbs[Math.floor(elapsedSeconds / 3) % activityVerbs.length];
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
