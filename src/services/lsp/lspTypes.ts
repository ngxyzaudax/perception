import { runShell } from "../../utils/shell.js";

export type LspLocation = {
  uri: string;
  line: number;
  character: number;
};

export type LspOperation =
  | "goToDefinition"
  | "findReferences"
  | "hover"
  | "documentSymbol"
  | "workspaceSymbol"
  | "goToImplementation";

export const formatLspLocations = (locations: LspLocation[]): string =>
  locations.length > 0
    ? locations.map((location) => `${location.uri}:${location.line}:${location.character}`).join("\n")
    : "No results";

export const pathToUri = (path: string): string =>
  path.startsWith("file://") ? path : `file://${path}`;

export const uriToPath = (uri: string): string => uri.replace(/^file:\/\//, "");

export const toLspPosition = (line: number, character: number): { line: number; character: number } => ({
  line: Math.max(0, line - 1),
  character: Math.max(0, character - 1),
});

export const readFileText = async (path: string): Promise<string> => {
  const { readFile } = await import("node:fs/promises");
  return readFile(path, "utf8");
};

export const runGitRoot = async (cwd: string): Promise<string | null> => {
  const result = await runShell("git rev-parse --show-toplevel", 5000, undefined, cwd);
  return result.exitCode === 0 ? result.stdout.trim() : null;
};
