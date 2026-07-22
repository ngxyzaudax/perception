import { Box, measureElement, type DOMElement } from "ink";
import { useLayoutEffect, useRef, useState } from "react";
import type { PermissionMode } from "../../types/permissions.js";
import type { DisplayMessage } from "../../types/displayMessages.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { Banner } from "./Banner.js";
import { computeBottomPadRows, estimateHistoryRows } from "./estimateHistoryRows.js";
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

const DEFAULT_CHROME_ROWS = 6;

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
}: ReplShellProps): React.ReactElement => {
  const { rows, columns } = useTerminalSize();
  const chromeRef = useRef<DOMElement>(null);
  const [chromeRows, setChromeRows] = useState(DEFAULT_CHROME_ROWS);
  const historyRows = estimateHistoryRows(messages, columns);
  const padRows = computeBottomPadRows(rows, historyRows, chromeRows);

  useLayoutEffect(() => {
    if (!chromeRef.current) {
      return;
    }
    const height = measureElement(chromeRef.current).height;
    if (height > 0 && height !== chromeRows) {
      setChromeRows(height);
    }
  });

  return (
    <Box flexDirection="column">
      <MessageHistory
        banner={<Banner cwd={cwd} version={version} />}
        messages={messages}
      />
      {padRows > 0 ? <Box height={padRows} flexShrink={0} /> : null}
      <Box ref={chromeRef} flexDirection="column" flexShrink={0}>
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
};
