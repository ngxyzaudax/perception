import type { Settings } from "../schemas/settings.js";
import { saveSettings } from "../utils/config.js";

export type ConfigCommandResult =
  | { type: "show"; message: string }
  | { type: "updated"; settings: Settings; message: string }
  | { type: "invalid"; message: string };

export const parseConfigCommand = (
  input: string,
  settings: Settings,
): ConfigCommandResult => {
  const parts = input.trim().split(/\s+/);
  if (parts.length === 1) {
    return { type: "show", message: formatSettings(settings) };
  }
  const key = parts[1];
  const value = parts.slice(2).join(" ");
  if (!value) {
    return { type: "invalid", message: "usage: /config <model|base-url|api-key> <value>" };
  }
  if (key === "model") {
    const next = { ...settings, model: value };
    void saveSettings(next);
    return { type: "updated", settings: next, message: `model set to ${value}` };
  }
  if (key === "base-url") {
    const next = { ...settings, baseUrl: value };
    void saveSettings(next);
    return { type: "updated", settings: next, message: `base url set to ${value}` };
  }
  if (key === "api-key") {
    const next = { ...settings, apiKey: value };
    void saveSettings(next);
    return { type: "updated", settings: next, message: "api key updated" };
  }
  return { type: "invalid", message: "unknown config key" };
};

const formatSettings = (settings: Settings): string =>
  [
    `baseUrl: ${settings.baseUrl}`,
    `model: ${settings.model ?? "auto"}`,
    `apiKey: ${settings.apiKey}`,
    `permissionMode: ${settings.permissionMode}`,
    `alwaysAllowRules: ${settings.alwaysAllowRules.length}`,
    "",
    "Update with:",
    "/config model <id>",
    "/config base-url <url>",
    "/config api-key <key>",
  ].join("\n");
