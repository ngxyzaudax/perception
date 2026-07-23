import type { QueryRuntimeExtras } from "../query/queryEngine.js";
import type { Settings } from "../schemas/settings.js";
import type { PermissionContext } from "../permissions/checkPermission.js";
import type { ChatMessage } from "../types/messages.js";
import type { SpinnerMode } from "./spinnerMode.js";

export type QueryOverrides = {
  model?: string;
  allowedTools?: string[];
};

export type ReplQueryController = {
  busy: boolean;
  preparing: boolean;
  isActive: boolean;
  streamingText: string;
  thinkingText: string;
  toolPreview: string;
  spinnerMode: SpinnerMode;
  status: string;
  queuedInputs: string[];
  queryStartedAt: number | null;
  setStatus: (status: string) => void;
  setPreparing: (preparing: boolean) => void;
  clearStream: () => void;
  abortQuery: () => void;
  queueInput: (input: string) => void;
  drainQueue: () => string[];
  runUserQuery: (
    nextMessages: ChatMessage[],
    settings: Settings,
    permissionContext: PermissionContext,
    runtimeExtras: QueryRuntimeExtras,
    onComplete: (messages: ChatMessage[]) => void,
    onMessageComplete?: (message: ChatMessage) => void,
    onErrorNotice?: (message: string) => void,
    systemPromptOverride?: string,
    overrides?: QueryOverrides,
  ) => Promise<void>;
};
