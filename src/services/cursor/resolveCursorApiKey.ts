import type { Settings } from "../../schemas/settings.js";

export const missingCursorApiKeyMessage = (): string =>
  "Cursor API key missing. Set cursorApiKey in ~/.perception/settings.json or export CURSOR_API_KEY.";

export const resolveCursorApiKey = (settings: Settings): string | undefined =>
  settings.cursorApiKey ?? process.env.CURSOR_API_KEY;

export const requireCursorApiKey = (settings: Settings): string | null => {
  const key = resolveCursorApiKey(settings);
  return key && key.trim().length > 0 ? key : null;
};
