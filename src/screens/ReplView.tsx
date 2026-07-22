import { Box } from "ink";
import { ActivityLine } from "../components/activity/ActivityLine.js";
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
  onSubmit,
  onExit,
}: ReplViewProps): React.ReactElement => {
  const gitBranch = useGitBranch();
  return (
    <ReplShell
      version="0.1.0"
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
          <LiveRegion thinkingText={query.thinkingText} streamingText={query.streamingText} />
          <AgentsPanel tasks={agentTasks} />
          <ActivityLine
            busy={query.busy}
            elapsedSeconds={elapsedSeconds}
            completionTokens={getUsage().completionTokens}
            status={query.status}
            queuedCount={query.queuedInputs.length}
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
          permissionContextRef={permissionContextRef}
          setDisplayMessages={setDisplayMessages}
        />
      }
      inputArea={
        <TextInput
          disabled={overlays.isPickerOpen}
          queueMode={query.busy && !overlays.isPickerOpen}
          queuedInputs={query.queuedInputs}
          onQueue={query.queueInput}
          onSubmit={onSubmit}
          onExitRequest={onExit}
        />
      }
    />
  );
};
