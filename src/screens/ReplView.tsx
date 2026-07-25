import { Box } from "ink";
import { ActivityLine } from "../components/activity/ActivityLine.js";
import { RunningToolsPanel } from "../components/activity/RunningToolsPanel.js";
import { AgentsPanel } from "../components/agents/AgentsPanel.js";
import { TextInput } from "../components/input/TextInput.js";
import { LiveRegion } from "../components/layout/LiveRegion.js";
import { ReplShell } from "../components/layout/ReplShell.js";
import type { AgentTask } from "../state/agentTasks.js";
import type { Settings } from "../schemas/settings.js";
import type { DisplayMessage } from "../types/displayMessages.js";
import type { PermissionMode } from "../types/permissions.js";
import type { ChatMessage } from "../types/messages.js";
import { getCwd } from "../utils/cwd.js";
import { getPackageVersion } from "../utils/packageVersion.js";
import { getUsage } from "../state/usage.js";
import { ReplOverlays } from "./ReplOverlays.js";
import { useGitBranch } from "./useGitBranch.js";
import type { OverlayController } from "./useOverlays.js";
import type { ReplQueryController } from "./useReplQuery.js";
import type { SessionController } from "./replSession.js";
import { createPermissionContext } from "../permissions/checkPermission.js";

type ReplViewProps = {
  model: string;
  displayMessages: DisplayMessage[];
  messages: ChatMessage[];
  agentTasks: AgentTask[];
  maxContextTokens: number;
  permissionMode: PermissionMode;
  coordinatorMode: boolean;
  runningAgentCount: number;
  query: ReplQueryController;
  elapsedSeconds: number;
  overlays: OverlayController;
  session: SessionController;
  liveSettings: Settings;
  permissionContextRef: React.MutableRefObject<ReturnType<typeof createPermissionContext>>;
  setDisplayMessages: React.Dispatch<React.SetStateAction<DisplayMessage[]>>;
  onCancelTurn: () => void;
  onSubmit: (value: string) => void;
  onExit: () => void;
};

export const ReplView = ({
  model,
  displayMessages,
  messages,
  agentTasks,
  maxContextTokens,
  permissionMode,
  coordinatorMode,
  runningAgentCount,
  query,
  elapsedSeconds,
  overlays,
  session,
  liveSettings,
  permissionContextRef,
  setDisplayMessages,
  onCancelTurn,
  onSubmit,
  onExit,
}: ReplViewProps): React.ReactElement => {
  const gitBranch = useGitBranch();
  return (
    <ReplShell
      version={getPackageVersion()}
      model={model}
      cwd={getCwd()}
      messages={displayMessages}
      contextTokens={getUsage().lastPromptTokens}
      maxContextTokens={maxContextTokens}
      permissionMode={permissionMode}
      coordinatorMode={coordinatorMode}
      runningAgentCount={runningAgentCount}
      gitBranch={gitBranch}
      liveRegion={
        <Box flexDirection="column">
          <LiveRegion
            thinkingText={query.thinkingText}
            streamingText={query.streamingText}
            toolPreview={query.toolPreview}
          />
          <AgentsPanel tasks={agentTasks} />
          <RunningToolsPanel />
          <ActivityLine
            isActive={query.isActive}
            elapsedSeconds={elapsedSeconds}
            completionTokens={getUsage().completionTokens}
            status={query.status}
            queuedCount={query.queuedInputs.length}
            mode={query.spinnerMode}
          />
        </Box>
      }
      overlays={
        <ReplOverlays
          overlays={overlays}
          session={session}
          query={query}
          messages={messages}
          liveSettings={liveSettings}
          maxContextTokens={maxContextTokens}
          permissionContextRef={permissionContextRef}
          setDisplayMessages={setDisplayMessages}
          onCancelTurn={onCancelTurn}
        />
      }
      inputArea={
        <TextInput
          disabled={overlays.isPickerOpen}
          queueMode={query.isActive && !overlays.isPickerOpen}
          queuedInputs={query.queuedInputs}
          onQueue={query.queueInput}
          onSubmit={onSubmit}
          onExitRequest={onExit}
          onInterrupt={onCancelTurn}
        />
      }
    />
  );
};
