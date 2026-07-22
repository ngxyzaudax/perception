import type { Settings } from "../schemas/settings.js";
import type { PermissionMode } from "../types/permissions.js";
import { saveSettings } from "../utils/config.js";

export type SlashCommandResult =
  | { type: "exit" }
  | { type: "clear" }
  | { type: "status"; message: string }
  | { type: "plan_approve" }
  | { type: "permission_mode"; mode: PermissionMode }
  | { type: "resume" }
  | { type: "memory" }
  | { type: "compact" }
  | { type: "mcp" }
  | { type: "tokens" }
  | { type: "help" }
  | { type: "doctor" }
  | { type: "config" }
  | { type: "plan" }
  | { type: "tasks" }
  | { type: "agents" }
  | { type: "diff" }
  | { type: "context" }
  | { type: "rewind" }
  | { type: "init" }
  | { type: "export" }
  | { type: "branch" }
  | { type: "coordinator" }
  | { type: "commit" }
  | { type: "review" }
  | { type: "query" };

export const parseSlashCommand = (
  input: string,
  permissionMode: PermissionMode,
  settings: Settings,
): SlashCommandResult => {
  if (input === "/exit") {
    return { type: "exit" };
  }
  if (input === "/clear") {
    return { type: "clear" };
  }
  if (input === "/model") {
    return { type: "status", message: "model" };
  }
  if (input.startsWith("/permissions")) {
    const nextMode = parsePermissionMode(input, permissionMode, settings);
    return { type: "permission_mode", mode: nextMode };
  }
  if (input === "/plan-approve") {
    return { type: "plan_approve" };
  }
  if (input === "/plan") {
    return { type: "plan" };
  }
  if (input === "/resume") {
    return { type: "resume" };
  }
  if (input === "/memory") {
    return { type: "memory" };
  }
  if (input === "/compact") {
    return { type: "compact" };
  }
  if (input === "/mcp") {
    return { type: "mcp" };
  }
  if (input === "/tokens") {
    return { type: "tokens" };
  }
  if (input === "/help") {
    return { type: "help" };
  }
  if (input === "/doctor") {
    return { type: "doctor" };
  }
  if (input.startsWith("/config")) {
    return { type: "config" };
  }
  if (input === "/tasks") {
    return { type: "tasks" };
  }
  if (input === "/agents") {
    return { type: "agents" };
  }
  if (input === "/diff") {
    return { type: "diff" };
  }
  if (input === "/context") {
    return { type: "context" };
  }
  if (input === "/rewind") {
    return { type: "rewind" };
  }
  if (input === "/init") {
    return { type: "init" };
  }
  if (input === "/export") {
    return { type: "export" };
  }
  if (input === "/branch") {
    return { type: "branch" };
  }
  if (input === "/coordinator") {
    return { type: "coordinator" };
  }
  if (input === "/commit") {
    return { type: "commit" };
  }
  if (input === "/review") {
    return { type: "review" };
  }
  return { type: "query" };
};

const parsePermissionMode = (
  input: string,
  current: PermissionMode,
  settings: Settings,
): PermissionMode => {
  const value = input.trim().split(/\s+/)[1];
  if (value === "default" || value === "plan" || value === "bypassPermissions") {
    void saveSettings({ ...settings, permissionMode: value });
    return value;
  }
  return current;
};
