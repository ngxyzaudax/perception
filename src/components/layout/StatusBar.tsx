import { Box, Text } from "ink";
import type { PermissionMode } from "../../types/permissions.js";
import { getMcpStatuses, mcpHealthSummary } from "../../services/mcp/mcpManager.js";
import { contextUsageColor, permissionModeColors } from "../../ui/theme.js";

type StatusBarProps = {
  model: string;
  contextTokens: number;
  maxContextTokens: number;
  permissionMode: PermissionMode;
  coordinatorMode: boolean;
  runningAgentCount: number;
  gitBranch: string | null;
};

const formatTokens = (tokens: number): string =>
  tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}k` : `${tokens}`;

export const StatusBar = ({
  model,
  contextTokens,
  maxContextTokens,
  permissionMode,
  coordinatorMode,
  runningAgentCount,
  gitBranch,
}: StatusBarProps): React.ReactElement => {
  const percent = maxContextTokens > 0 ? Math.round((contextTokens / maxContextTokens) * 100) : 0;
  const modeColor = permissionModeColors[permissionMode];
  const mcpStatuses = getMcpStatuses();
  const mcpHealth = mcpHealthSummary(mcpStatuses);
  const mcpFailing = mcpStatuses.some((status) => status.error);
  return (
    <Box marginTop={1}>
      <Text dimColor>
        {model}
        {gitBranch ? (
          <>
            {" | "}
            <Text color="cyan">{gitBranch}</Text>
          </>
        ) : null}
        {" | "}
        <Text color={contextUsageColor(percent)}>
          ctx {formatTokens(contextTokens)} ({percent}%)
        </Text>
        {" | "}
        <Text color={modeColor}>{permissionMode}</Text>
        {coordinatorMode ? " | coordinator" : ""}
        {runningAgentCount > 0 ? ` | agents: ${runningAgentCount}` : ""}
        {mcpHealth ? (
          <>
            {" | "}
            <Text color={mcpFailing ? "red" : undefined}>{mcpHealth}</Text>
          </>
        ) : null}
      </Text>
    </Box>
  );
};
