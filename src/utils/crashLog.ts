import { appendFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const crashLogDir = (): string => join(homedir(), ".perception", "logs");

const formatError = (error: unknown): string =>
  error instanceof Error ? `${error.message}\n${error.stack ?? ""}` : String(error);

export const writeCrashLog = (kind: string, error: unknown): string => {
  const dir = crashLogDir();
  const path = join(dir, "crash.log");
  mkdirSync(dir, { recursive: true });
  appendFileSync(path, `${new Date().toISOString()} [${kind}] ${formatError(error)}\n`);
  return path;
};

export const installCrashHandlers = (): void => {
  process.on("unhandledRejection", (reason) => {
    const path = writeCrashLog("unhandledRejection", reason);
    process.stderr.write(`Unhandled promise rejection recorded in ${path}\n`);
  });
  process.on("uncaughtException", (error) => {
    const path = writeCrashLog("uncaughtException", error);
    process.stderr.write(`Fatal error recorded in ${path}\n`);
    process.exit(1);
  });
};
