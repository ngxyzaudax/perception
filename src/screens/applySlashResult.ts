import type { Settings } from "../schemas/settings.js";
import type { DisplayMessage } from "../types/displayMessages.js";
import type { PermissionMode } from "../types/permissions.js";
import { appendStatus, clearDisplay, replaceChatMessages, syncChatMessages } from "./displayState.js";
import { approvePlanContext, type SlashActionResult } from "./slashCommandActions.js";
import type { OverlayController } from "./useOverlays.js";
import type { ReplQueryController } from "./useReplQuery.js";
import type { SessionController } from "./replSession.js";
import { listTrackedCheckpoints } from "../services/checkpoints/checkpointState.js";
import { getRewindUnavailableMessage } from "./slashCommandActions.js";
import { createPermissionContext } from "../permissions/checkPermission.js";

export type SlashResultDeps = {
  coordinatorMode: boolean;
  overlays: OverlayController;
  query: ReplQueryController;
  permissionContextRef: React.MutableRefObject<ReturnType<typeof createPermissionContext>>;
  setLiveSettings: (settings: Settings) => void;
  setDisplayMessages: React.Dispatch<React.SetStateAction<DisplayMessage[]>>;
  updatePermissionMode: (mode: PermissionMode) => void;
  submitQuery: (messages: import("../types/messages.js").ChatMessage[]) => Promise<void>;
  onExit: () => void;
  session: SessionController;
};

export const applySlashResult = async (
  result: SlashActionResult,
  deps: SlashResultDeps,
): Promise<boolean> => {
  if (result.type === "exit") {
    deps.onExit();
    return true;
  }
  if (result.type === "clear") {
    deps.setDisplayMessages(clearDisplay());
    deps.query.clearStream();
    return true;
  }
  if (result.type === "status") {
    deps.setDisplayMessages((current) => appendStatus(current, result.content, result.title));
    return true;
  }
  if (result.type === "update_settings") {
    deps.setLiveSettings(result.settings);
    deps.setDisplayMessages((current) => appendStatus(current, "settings updated", "Config"));
    return true;
  }
  if (result.type === "update_permission_mode") {
    deps.updatePermissionMode(result.mode);
    deps.setDisplayMessages((current) =>
      appendStatus(current, `permission mode: ${result.mode}`, "Permissions"),
    );
    return true;
  }
  if (result.type === "approve_plan") {
    deps.permissionContextRef.current = approvePlanContext(deps.permissionContextRef.current);
    deps.setDisplayMessages((current) =>
      appendStatus(current, "plan approved for mutating tools", "Plan"),
    );
    return true;
  }
  if (result.type === "set_messages") {
    deps.setDisplayMessages((current) => replaceChatMessages(current, result.messages));
    deps.setDisplayMessages((current) => appendStatus(current, "conversation compacted", "Compact"));
    return true;
  }
  if (result.type === "resume") {
    const sessions = await deps.session.openResumePicker();
    if (!sessions) {
      deps.setDisplayMessages((current) =>
        appendStatus(current, "no sessions for this directory", "Resume"),
      );
      return true;
    }
    deps.overlays.setResumeSessions(sessions);
    return true;
  }
  if (result.type === "rewind") {
    const tracked = listTrackedCheckpoints();
    if (tracked.length === 0) {
      const message = await getRewindUnavailableMessage();
      deps.setDisplayMessages((current) => appendStatus(current, message, "Rewind"));
      return true;
    }
    deps.overlays.setRewindCheckpoints(tracked);
    return true;
  }
  if (result.type === "branch") {
    deps.setDisplayMessages((current) =>
      appendStatus(current, `branched to session ${result.sessionId}`, "Branch"),
    );
    return true;
  }
  if (result.type === "toggle_coordinator") {
    deps.setDisplayMessages((current) =>
      appendStatus(
        current,
        deps.coordinatorMode
          ? "coordinator mode disabled"
          : "coordinator mode enabled (agents default to background)",
        "Coordinator",
      ),
    );
    return true;
  }
  if (result.type === "skill" || result.type === "query") {
    deps.setDisplayMessages((current) => syncChatMessages(current, result.messages));
    await deps.submitQuery(result.messages);
    return true;
  }
  return false;
};
