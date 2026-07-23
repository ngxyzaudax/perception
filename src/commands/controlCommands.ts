import { setPermissionMode } from "../permissions/checkPermission.js";
import { compactConversation } from "../services/compact/compactConversation.js";
import { persistCompactSummary } from "../services/memory/sessionMemory.js";
import { runInit } from "../services/init/runInit.js";
import { parseConfigCommand } from "../screens/configCommand.js";
import {
  isAutoRunOn,
  parseAutoRunArg,
  resolveAutoRunMode,
} from "../screens/autoRunToggle.js";
import { saveSettings } from "../utils/config.js";
import type { PermissionMode } from "../types/permissions.js";
import type { Command } from "./types.js";

const parsePermissionModeArg = (input: string): PermissionMode | null => {
  const value = input.trim().split(/\s+/)[1];
  if (value === "default" || value === "plan" || value === "bypassPermissions") {
    return value;
  }
  return null;
};

export const controlCommands: Command[] = [
  {
    name: "/permissions",
    description: "Set permission mode",
    argumentHint: "default | plan | bypassPermissions",
    execute: async (context) => {
      const parsed = parsePermissionModeArg(context.input);
      if (parsed) {
        void saveSettings({ ...context.settings, permissionMode: parsed });
      }
      const mode = parsed ?? context.permissionMode;
      context.onPermissionContextUpdate(
        setPermissionMode(context.permissionContext, mode),
      );
      return { type: "update_permission_mode", mode };
    },
  },
  {
    name: "/auto-run",
    description: "Toggle auto-run (skip permission prompts)",
    argumentHint: "on | off | status",
    execute: async (context) => {
      const arg = parseAutoRunArg(context.input);
      if (arg === "status") {
        return {
          type: "status",
          content: isAutoRunOn(context.permissionMode)
            ? "auto-run is on"
            : "auto-run is off",
          title: "Auto-run",
        };
      }
      const mode = resolveAutoRunMode(arg, context.permissionMode);
      void saveSettings({ ...context.settings, permissionMode: mode });
      context.onPermissionContextUpdate(
        setPermissionMode(context.permissionContext, mode),
      );
      return { type: "update_permission_mode", mode };
    },
  },
  {
    name: "/plan-approve",
    description: "Approve current plan",
    execute: async () => ({ type: "approve_plan" }),
  },
  {
    name: "/compact",
    description: "Compact conversation history",
    execute: async (context) => {
      const compacted = await compactConversation(context.settings, context.messages);
      persistCompactSummary(context.session.getSessionId(), compacted);
      context.session.persistSession(compacted);
      return { type: "set_messages", messages: compacted };
    },
  },
  {
    name: "/config",
    description: "View or update config",
    argumentHint: "[set <key> <value>]",
    execute: async (context) => {
      const result = parseConfigCommand(context.input, context.settings);
      if (result.type === "updated") {
        return { type: "update_settings", settings: result.settings };
      }
      return { type: "status", content: result.message, title: "Config" };
    },
  },
  {
    name: "/init",
    description: "Initialize project memory",
    execute: async (context) => ({
      type: "status",
      content: await runInit(context.settings),
      title: "Init",
    }),
  },
];
