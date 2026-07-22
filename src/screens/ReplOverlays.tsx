import { CheckpointPicker } from "../components/CheckpointPicker.js";
import { PermissionPrompt } from "../components/PermissionPrompt.js";
import { QuestionPrompt } from "../components/QuestionPrompt.js";
import { SessionPicker } from "../components/SessionPicker.js";
import { addAlwaysAllowRule } from "../permissions/checkPermission.js";
import type { Settings } from "../schemas/settings.js";
import type { DisplayMessage } from "../types/displayMessages.js";
import type { ChatMessage } from "../types/messages.js";
import { saveSettings } from "../utils/config.js";
import { appendStatus, replaceChatMessages } from "./displayState.js";
import { restoreRewindCheckpoint } from "./slashCommandActions.js";
import type { OverlayController } from "./useOverlays.js";
import type { ReplQueryController } from "./useReplQuery.js";
import type { SessionController } from "./replSession.js";
import { setActiveSessionId } from "../state/backgroundTasks.js";
import { createPermissionContext } from "../permissions/checkPermission.js";

type ReplOverlaysProps = {
  overlays: OverlayController;
  session: SessionController;
  query: ReplQueryController;
  messages: ChatMessage[];
  liveSettings: Settings;
  permissionContextRef: React.MutableRefObject<ReturnType<typeof createPermissionContext>>;
  setDisplayMessages: React.Dispatch<React.SetStateAction<DisplayMessage[]>>;
};

export const ReplOverlays = ({
  overlays,
  session,
  query,
  messages,
  liveSettings,
  permissionContextRef,
  setDisplayMessages,
}: ReplOverlaysProps): React.ReactElement => {
  const pendingPermission = overlays.permissionQueue[0] ?? null;
  return (
    <>
      {overlays.resumeSessions ? (
        <SessionPicker
          sessions={overlays.resumeSessions}
          onSelect={(sessionId) => {
            void session.resumeSession(sessionId).then((loaded) => {
              overlays.setResumeSessions(null);
              if (!loaded) {
                setDisplayMessages((current) =>
                  appendStatus(current, "failed to load session", "Resume"),
                );
                return;
              }
              setDisplayMessages((current) => replaceChatMessages(current, loaded.messages));
              setActiveSessionId(session.getSessionId());
              query.clearStream();
              setDisplayMessages((current) =>
                appendStatus(current, `resumed ${loaded.title}`, "Resume"),
              );
            });
          }}
          onCancel={() => {
            overlays.setResumeSessions(null);
          }}
        />
      ) : null}
      {overlays.rewindCheckpoints !== null ? (
        <CheckpointPicker
          checkpoints={overlays.rewindCheckpoints}
          onSelect={(sha) => {
            void restoreRewindCheckpoint(sha, messages).then((restored) => {
              overlays.setRewindCheckpoints(null);
              if (!restored) {
                setDisplayMessages((current) =>
                  appendStatus(current, "failed to restore checkpoint", "Rewind"),
                );
                return;
              }
              setDisplayMessages((current) => replaceChatMessages(current, restored.messages));
              session.persistSession(restored.messages);
              query.clearStream();
              setDisplayMessages((current) =>
                appendStatus(current, `rewound to ${restored.label}`, "Rewind"),
              );
            });
          }}
          onCancel={() => {
            overlays.setRewindCheckpoints(null);
          }}
        />
      ) : null}
      {pendingPermission ? (
        <PermissionPrompt
          toolName={pendingPermission.toolName}
          summary={pendingPermission.summary}
          preview={pendingPermission.preview}
          onResolve={(result) => {
            if (result.granted && result.persistRule) {
              permissionContextRef.current = addAlwaysAllowRule(
                permissionContextRef.current,
                result.persistRule,
              );
              void saveSettings({
                ...liveSettings,
                alwaysAllowRules: [...permissionContextRef.current.alwaysAllowRules],
              });
            }
            overlays.resolvePermission(result);
          }}
        />
      ) : null}
      {overlays.pendingQuestion ? (
        <QuestionPrompt
          question={overlays.pendingQuestion.question}
          options={overlays.pendingQuestion.options}
          onResolve={overlays.resolveQuestion}
        />
      ) : null}
    </>
  );
};
