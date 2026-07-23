import { CheckpointPicker } from "../components/CheckpointPicker.js";
import { PermissionPrompt } from "../components/PermissionPrompt.js";
import { QuestionPrompt } from "../components/QuestionPrompt.js";
import { SessionPicker } from "../components/SessionPicker.js";
import { addAlwaysAllowRule } from "../permissions/checkPermission.js";
import { sanitizePersistRule } from "../permissions/dangerousRules.js";
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
import { applySessionMemory, loadSessionMemory } from "../services/memory/sessionMemory.js";

type ReplOverlaysProps = {
  overlays: OverlayController;
  session: SessionController;
  query: ReplQueryController;
  messages: ChatMessage[];
  liveSettings: Settings;
  maxContextTokens: number;
  permissionContextRef: React.MutableRefObject<ReturnType<typeof createPermissionContext>>;
  setDisplayMessages: React.Dispatch<React.SetStateAction<DisplayMessage[]>>;
};

export const ReplOverlays = ({
  overlays,
  session,
  query,
  messages,
  liveSettings,
  maxContextTokens,
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
            void session.resumeSession(sessionId).then(async (loaded) => {
              overlays.setResumeSessions(null);
              if (!loaded) {
                setDisplayMessages((current) =>
                  appendStatus(current, "failed to load session", "Resume"),
                );
                return;
              }
              const memory = await loadSessionMemory(sessionId);
              const resumed = applySessionMemory(loaded.messages, memory, maxContextTokens);
              setDisplayMessages((current) => replaceChatMessages(current, resumed));
              setActiveSessionId(session.getSessionId());
              query.clearStream();
              setDisplayMessages((current) =>
                appendStatus(
                  current,
                  resumed === loaded.messages
                    ? `resumed ${loaded.title}`
                    : `resumed ${loaded.title} (history condensed from session memory)`,
                  "Resume",
                ),
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
          suggestedPersistRule={pendingPermission.suggestedPersistRule}
          onResolve={(result) => {
            const rule =
              result.granted && result.persistRule
                ? sanitizePersistRule(result.persistRule)
                : null;
            if (rule) {
              permissionContextRef.current = addAlwaysAllowRule(
                permissionContextRef.current,
                rule,
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
