import { z } from "zod";
import { buildTool } from "../Tool.js";
import { loadSettings, saveSettings } from "../utils/config.js";
import type { Settings } from "../schemas/settings.js";

const inputSchema = z.object({
  operation: z.enum(["get", "set"]).describe("Read or update settings"),
  key: z
    .enum(["model", "baseUrl", "permissionMode"])
    .optional()
    .describe("Setting key for set operation"),
  value: z.string().optional().describe("New value for set operation"),
});

const allowedKeys = ["model", "baseUrl", "permissionMode"] as const;

export const ConfigTool = buildTool({
  name: "Config",
  description: "Read or update whitelisted perception settings",
  inputSchema,
  isReadOnly: (input) => input.operation === "get",
  summarize: (input) => input.operation,
  call: async (input) => {
    const settings = await loadSettings();
    if (input.operation === "get") {
      return formatSettings(settings);
    }
    if (!input.key || input.value === undefined) {
      return "set requires key and value";
    }
    const next = applySetting(settings, input.key, input.value);
    await saveSettings(next);
    return `${input.key} set to ${input.value}`;
  },
});

const applySetting = (settings: Settings, key: (typeof allowedKeys)[number], value: string): Settings => {
  if (key === "permissionMode") {
    if (value !== "default" && value !== "plan" && value !== "bypassPermissions") {
      throw new Error("permissionMode must be default, plan, or bypassPermissions");
    }
    return { ...settings, permissionMode: value };
  }
  if (key === "baseUrl") {
    return { ...settings, baseUrl: value };
  }
  return { ...settings, model: value };
};

const formatSettings = (settings: Settings): string =>
  [
    `baseUrl: ${settings.baseUrl}`,
    `model: ${settings.model ?? "auto"}`,
    `permissionMode: ${settings.permissionMode}`,
    `alwaysAllowRules: ${settings.alwaysAllowRules.length}`,
  ].join("\n");
