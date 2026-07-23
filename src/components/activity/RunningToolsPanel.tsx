import { Box, Text } from "ink";
import { useSyncExternalStore } from "react";
import {
  getRunningTools,
  subscribeRunningTools,
} from "../../state/runningTools.js";
import { colors } from "../../ui/theme.js";

export const RunningToolsPanel = (): React.ReactElement | null => {
  const tools = useSyncExternalStore(
    subscribeRunningTools,
    getRunningTools,
    getRunningTools,
  );
  if (tools.length === 0) {
    return null;
  }
  return (
    <Box flexDirection="column">
      {tools.map((tool) => (
        <Text key={tool.name} color={colors.tool} dimColor>
          {formatRunningTool(tool.name, tool.count, tool.elapsedMs)}
        </Text>
      ))}
    </Box>
  );
};

const formatRunningTool = (
  name: string,
  count: number,
  elapsedMs: number,
): string => {
  const suffix = count > 1 ? ` x${count}` : "";
  const elapsed = elapsedMs >= 1000 ? ` (${Math.round(elapsedMs / 1000)}s)` : "";
  return `  ${name}${suffix} running${elapsed}`;
};
