import { execa } from "execa";
import { getCwd } from "./cwd.js";

export type ShellResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

export const runShell = async (
  command: string,
  timeoutMs: number,
  signal?: AbortSignal,
  cwd?: string,
): Promise<ShellResult> => {
  const result = await execa("bash", ["-lc", command], {
    cwd: cwd ?? getCwd(),
    timeout: timeoutMs,
    reject: false,
    cancelSignal: signal,
    env: process.env,
  });

  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    exitCode: result.exitCode ?? 1,
  };
};
