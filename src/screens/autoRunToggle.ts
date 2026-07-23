import type { Settings } from "../schemas/settings.js";
import type { PermissionMode } from "../types/permissions.js";
import { saveSettings } from "../utils/config.js";

export type AutoRunArg = "on" | "off" | "status" | null;

export const isAutoRunOn = (mode: PermissionMode): boolean =>
  mode === "bypassPermissions";

export const nextAutoRunMode = (mode: PermissionMode): PermissionMode =>
  isAutoRunOn(mode) ? "default" : "bypassPermissions";

export const parseAutoRunArg = (input: string): AutoRunArg => {
  const value = input.trim().split(/\s+/)[1];
  if (value === "on" || value === "off" || value === "status") {
    return value;
  }
  return null;
};

export const resolveAutoRunMode = (
  arg: "on" | "off" | null,
  current: PermissionMode,
): PermissionMode => {
  if (arg === "on") {
    return "bypassPermissions";
  }
  if (arg === "off") {
    return "default";
  }
  return nextAutoRunMode(current);
};

export const autoRunStatusText = (mode: PermissionMode): string =>
  isAutoRunOn(mode)
    ? "auto-run enabled: permission prompts skipped"
    : `auto-run disabled: mode ${mode}`;

export type AutoRunToggleDeps = {
  permissionMode: PermissionMode;
  liveSettings: Settings;
  updatePermissionMode: (mode: PermissionMode) => void;
  appendStatusLine: (content: string, title: string) => void;
};

export const applyAutoRunToggle = (deps: AutoRunToggleDeps): PermissionMode => {
  const mode = nextAutoRunMode(deps.permissionMode);
  deps.updatePermissionMode(mode);
  void saveSettings({ ...deps.liveSettings, permissionMode: mode });
  deps.appendStatusLine(autoRunStatusText(mode), "Auto-run");
  return mode;
};
