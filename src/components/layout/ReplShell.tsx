import { Box } from "ink";
import type { PermissionMode } from "../../types/permissions.js";
import type { DisplayMessage } from "../../types/displayMessages.js";
import { Banner } from "./Banner.js";
import { MessageHistory } from "./MessageHistory.js";
import { StatusBar } from "./StatusBar.js";

type ReplShellProps = {
  version: string;
  model: string;
  cwd: string;
  messages: DisplayMessage[];
  contextTokens: number;
  maxContextTokens: number;
  permissionMode: PermissionMode;
  coordinatorMode: boolean;
  runningAgentCount: number;
  gitBranch: string | null;
  liveRegion: React.ReactNode;
  overlays: React.ReactNode;
  inputArea: React.ReactNode;
};

export const ReplShell = ({
  version,
  model,
  cwd,
  messages,
  contextTokens,
  maxContextTokens,
  permissionMode,
  coordinatorMode,
  runningAgentCount,
  gitBranch,
  liveRegion,
  overlays,
  inputArea,
}: ReplShellProps): React.ReactElement => (
  <Box flexDirection="column">
    <MessageHistory
      banner={<Banner cwd={cwd} version={version} />}
      messages={messages}
    />
    <Box flexDirection="column" flexShrink={0}>
      {liveRegion}
      {overlays}
      {inputArea}
      <StatusBar
        model={model}
        contextTokens={contextTokens}
        maxContextTokens={maxContextTokens}
        permissionMode={permissionMode}
        coordinatorMode={coordinatorMode}
        runningAgentCount={runningAgentCount}
        gitBranch={gitBranch}
      />
    </Box>
  </Box>
);
