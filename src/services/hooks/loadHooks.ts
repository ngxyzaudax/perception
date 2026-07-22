import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { hooksConfigSchema, type HookEvent, type HooksConfig } from "./hookSchema.js";
import { loadSettings } from "../../utils/config.js";
import { getCwd } from "../../utils/cwd.js";

export const loadHooksConfig = async (): Promise<HooksConfig> => {
  const globalSettings = await loadSettings();
  const projectHooks = await loadProjectHooks();
  return mergeHooks(globalSettings.hooks ?? {}, projectHooks);
};

const loadProjectHooks = async (): Promise<HooksConfig> => {
  try {
    const raw = await readFile(join(getCwd(), ".perception", "settings.json"), "utf8");
    const parsed = JSON.parse(raw) as { hooks?: unknown };
    return hooksConfigSchema.parse(parsed.hooks ?? {});
  } catch {
    return {};
  }
};

const mergeHooks = (left: HooksConfig, right: HooksConfig): HooksConfig => {
  const merged: HooksConfig = { ...left };
  for (const [event, matchers] of Object.entries(right)) {
    const hookEvent = event as HookEvent;
    merged[hookEvent] = [...(merged[hookEvent] ?? []), ...(matchers ?? [])];
  }
  return merged;
};
