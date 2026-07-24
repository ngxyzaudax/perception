import { useInput } from "ink";
import { useCallback, useEffect, useMemo } from "react";
import { applyAutoRunToggle } from "./autoRunToggle.js";
import { appendStatus } from "./displayState.js";
import { ReplView } from "./ReplView.js";
import { cancelTurn } from "./cancelTurn.js";
import { useAgentTasksPoll } from "./useAgentTasksPoll.js";
import { useElapsedSeconds } from "./useElapsedSeconds.js";
import { useOverlays } from "./useOverlays.js";
import { useNotifications } from "./useNotifications.js";
import { useReplBootstrap } from "./useReplBootstrap.js";
import { useReplQuery } from "./useReplQuery.js";
import { useReplQueryFlow } from "./useReplQueryFlow.js";
import { useReplSubmit } from "./useReplSubmit.js";
import { useReplState } from "./useReplState.js";
import type { Settings } from "../schemas/settings.js";

type ReplProps = {
  settings: Settings;
  onExit: () => void;
};

export const Repl = ({ settings: initialSettings, onExit }: ReplProps): React.ReactElement => {
  const state = useReplState(initialSettings);
  const query = useReplQuery(state.registry);
  const overlays = useOverlays();
  const notifications = useNotifications();
  const elapsedSeconds = useElapsedSeconds(query.queryStartedAt);

  const runtimeExtras = useMemo(
    () => ({
      sessionId: state.session.getSessionId(),
      hooksConfig: state.hooksConfig,
      updatePermissionMode: state.updatePermissionMode,
      requestQuestion: overlays.requestQuestion,
      coordinatorMode: state.coordinatorMode,
    }),
    [overlays.requestQuestion, state],
  );

  useReplBootstrap({
    liveSettings: state.liveSettings,
    session: state.session,
    setHooksConfig: state.setHooksConfig,
    setSkills: state.setSkills,
    setRegistry: state.setRegistry,
    setModel: state.setModel,
    setMaxContextTokens: state.setMaxContextTokens,
    setDisplayMessages: state.setDisplayMessages,
  });

  useEffect(() => {
    notifications.bindBusy(query.isActive);
  }, [notifications, query.isActive]);
  useEffect(() => {
    notifications.bindMessages(state.messages);
  }, [notifications, state.messages]);

  const onCancelTurn = useCallback((): void => {
    cancelTurn({
      cancelPermissions: overlays.cancelPermissions,
      cancelQuestion: overlays.cancelQuestion,
      abortQuery: query.abortQuery,
    });
  }, [overlays, query]);

  useInput(
    (_input, key) => {
      if (key.tab && key.shift) {
        applyAutoRunToggle({
          permissionMode: state.permissionMode,
          liveSettings: state.liveSettings,
          updatePermissionMode: state.updatePermissionMode,
          appendStatusLine: (content, title) =>
            state.setDisplayMessages((current) => appendStatus(current, content, title)),
        });
        return;
      }
      if (key.escape && query.isActive) {
        onCancelTurn();
      }
    },
    {
      isActive:
        overlays.pendingQuestion === null && overlays.permissionQueue.length === 0,
    },
  );

  const submitQuery = useReplQueryFlow({
    liveSettings: state.liveSettings,
    model: state.model,
    permissionMode: state.permissionMode,
    coordinatorMode: state.coordinatorMode,
    permissionContextRef: state.permissionContextRef,
    runtimeExtras,
    query,
    session: state.session,
    overlaysRequestPermission: overlays.requestPermission,
    setDisplayMessages: state.setDisplayMessages,
  });

  useEffect(() => {
    notifications.bindSubmit(submitQuery);
  }, [notifications, submitQuery]);

  const handleSubmit = useReplSubmit({
    liveSettings: state.liveSettings,
    permissionMode: state.permissionMode,
    coordinatorMode: state.coordinatorMode,
    messages: state.messages,
    skills: state.skills,
    hooksConfig: state.hooksConfig,
    registry: state.registry,
    session: state.session,
    maxContextTokens: state.maxContextTokens,
    overlays,
    query,
    permissionContextRef: state.permissionContextRef,
    setLiveSettings: state.setLiveSettings,
    setCoordinatorMode: state.setCoordinatorMode,
    setModel: state.setModel,
    setMaxContextTokens: state.setMaxContextTokens,
    setDisplayMessages: state.setDisplayMessages,
    updatePermissionMode: state.updatePermissionMode,
    submitQuery,
    onExit,
  });

  const agentTasks = useAgentTasksPoll(state.session.getSessionId());
  const runningAgentCount = agentTasks.filter((task) => task.status === "running").length;

  return (
    <ReplView
      model={state.model}
      displayMessages={state.displayMessages}
      messages={state.messages}
      agentTasks={agentTasks}
      maxContextTokens={state.maxContextTokens}
      permissionMode={state.permissionMode}
      coordinatorMode={state.coordinatorMode}
      runningAgentCount={runningAgentCount}
      query={query}
      elapsedSeconds={elapsedSeconds}
      overlays={overlays}
      session={state.session}
      liveSettings={state.liveSettings}
      permissionContextRef={state.permissionContextRef}
      setDisplayMessages={state.setDisplayMessages}
      onCancelTurn={onCancelTurn}
      onSubmit={(value) => {
        void handleSubmit(value).catch((error: unknown) => {
          query.setStatus(error instanceof Error ? error.message : "submit failed");
        });
      }}
      onExit={onExit}
    />
  );
};
