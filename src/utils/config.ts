import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { settingsSchema, type Settings } from "../schemas/settings.js";

const configPath = (): string => join(homedir(), ".perception", "settings.json");

export const loadSettings = async (): Promise<Settings> => {
  const envSettings: Partial<Settings> = {
    baseUrl: process.env.PERCEPTION_BASE_URL,
    model: process.env.PERCEPTION_MODEL,
    apiKey: process.env.PERCEPTION_API_KEY,
    cursorApiKey: process.env.CURSOR_API_KEY,
    permissionMode: process.env.PERCEPTION_PERMISSION_MODE as Settings["permissionMode"],
    webSearchUrls: parseUrlList(process.env.PERCEPTION_WEB_SEARCH_URLS),
  };

  try {
    const raw = await readFile(configPath(), "utf8");
    const fileSettings = settingsSchema.partial().parse(JSON.parse(raw));
    return settingsSchema.parse({ ...fileSettings, ...stripUndefined(envSettings) });
  } catch {
    return settingsSchema.parse(stripUndefined(envSettings));
  }
};

export const saveSettings = async (settings: Settings): Promise<void> => {
  await mkdir(join(homedir(), ".perception"), { recursive: true });
  await writeFile(configPath(), `${JSON.stringify(settings, null, 2)}\n`, "utf8");
};

const stripUndefined = <T extends Record<string, unknown>>(value: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as Partial<T>;

const parseUrlList = (value: string | undefined): string[] | undefined => {
  if (!value || value.trim().length === 0) {
    return undefined;
  }
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
};