import { extname } from "node:path";
import type { Settings } from "../../schemas/settings.js";
import { expandPath } from "../../utils/path.js";
import { getCwd } from "../../utils/cwd.js";
import { LspClient, type LspServerConfig } from "./lspClient.js";
import {
  formatLspLocations,
  readFileText,
  type LspLocation,
  type LspOperation,
  uriToPath,
} from "./lspTypes.js";

const clients = new Map<string, LspClient>();

export const runLspOperation = async (
  settings: Settings,
  cwd: string,
  operation: LspOperation,
  filePath: string,
  line: number,
  character: number,
): Promise<string> => {
  const absolutePath = expandPath(filePath, cwd);
  const extension = extname(absolutePath);
  const server = resolveServer(settings, extension);
  if (!server) {
    return `No LSP server configured for extension ${extension || "(none)"}`;
  }
  const languageId = server.config.extensionToLanguage[extension];
  if (!languageId) {
    return `No language id configured for extension ${extension}`;
  }
  const client = await getClient(server.name, server.config, cwd);
  const text = await readFileText(absolutePath);
  const result = await client.runOperation(
    operation,
    absolutePath,
    line,
    character,
    languageId,
    text,
  );
  if (operation === "hover") {
    const contents = (result as { contents?: unknown })?.contents;
    return typeof contents === "string" ? contents : JSON.stringify(contents ?? result, null, 2);
  }
  return formatLspLocations(normalizeLocations(result));
};

export const shutdownLspClients = async (): Promise<void> => {
  await Promise.all([...clients.values()].map((client) => client.shutdown()));
  clients.clear();
};

const getClient = async (
  name: string,
  config: LspServerConfig,
  cwd: string,
): Promise<LspClient> => {
  const existing = clients.get(name);
  if (existing) {
    return existing;
  }
  const client = new LspClient(config, cwd || getCwd());
  await client.start();
  clients.set(name, client);
  return client;
};

const resolveServer = (
  settings: Settings,
  extension: string,
): { name: string; config: LspServerConfig } | null => {
  for (const [name, config] of Object.entries(settings.lspServers ?? {})) {
    if (extension in config.extensionToLanguage) {
      return { name, config };
    }
  }
  return null;
};

const normalizeLocations = (result: unknown): LspLocation[] => {
  if (!result) {
    return [];
  }
  if (Array.isArray(result)) {
    return result.flatMap((entry) => normalizeLocation(entry));
  }
  return normalizeLocation(result);
};

const normalizeLocation = (entry: unknown): LspLocation[] => {
  const location = entry as {
    uri?: string;
    range?: { start?: { line?: number; character?: number } };
    location?: { uri?: string; range?: { start?: { line?: number; character?: number } } };
  };
  const target = location.location ?? location;
  if (!target.uri || !target.range?.start) {
    return [];
  }
  return [
    {
      uri: uriToPath(target.uri),
      line: (target.range.start.line ?? 0) + 1,
      character: (target.range.start.character ?? 0) + 1,
    },
  ];
};
