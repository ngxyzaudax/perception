import { spawn, type ChildProcess } from "node:child_process";
import { getCwd } from "./cwd.js";
import { killProcessTree } from "./killProcessTree.js";

export type ShellResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
  aborted: boolean;
  timedOut: boolean;
};

type SettleState = {
  settled: boolean;
  aborted: boolean;
  timedOut: boolean;
  stdout: string;
  stderr: string;
};

const abortedResult = (): ShellResult => ({
  stdout: "",
  stderr: "aborted",
  exitCode: 130,
  aborted: true,
  timedOut: false,
});

const toResult = (state: SettleState, exitCode: number): ShellResult => ({
  stdout: state.stdout,
  stderr: state.stderr,
  exitCode: state.aborted ? 130 : state.timedOut ? 124 : exitCode,
  aborted: state.aborted,
  timedOut: state.timedOut,
});

const killShellTree = (pid: number | undefined): void => {
  if (pid === undefined) {
    return;
  }
  void killProcessTree(pid);
};

const attachOutputBuffers = (child: ChildProcess, state: SettleState): void => {
  child.stdout?.on("data", (chunk: Buffer | string) => {
    state.stdout += chunk.toString();
  });
  child.stderr?.on("data", (chunk: Buffer | string) => {
    state.stderr += chunk.toString();
  });
};

export const runShell = async (
  command: string,
  timeoutMs: number,
  signal?: AbortSignal,
  cwd?: string,
): Promise<ShellResult> => {
  if (signal?.aborted) {
    return abortedResult();
  }

  const child = spawn("bash", ["-lc", command], {
    cwd: cwd ?? getCwd(),
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
    detached: process.platform !== "win32",
    windowsHide: true,
  });

  const state: SettleState = {
    settled: false,
    aborted: false,
    timedOut: false,
    stdout: "",
    stderr: "",
  };
  attachOutputBuffers(child, state);

  return new Promise<ShellResult>((resolve) => {
    const settle = (exitCode: number): void => {
      if (state.settled) {
        return;
      }
      state.settled = true;
      clearTimeout(timeoutId);
      signal?.removeEventListener("abort", onAbort);
      resolve(toResult(state, exitCode));
    };

    const killAndSettle = (kind: "abort" | "timeout"): void => {
      if (kind === "abort") {
        state.aborted = true;
      } else {
        state.timedOut = true;
      }
      killShellTree(child.pid);
      settle(kind === "abort" ? 130 : 124);
    };

    const onAbort = (): void => {
      killAndSettle("abort");
    };

    const timeoutId = setTimeout(() => {
      killAndSettle("timeout");
    }, timeoutMs);

    child.once("exit", (code, killSignal) => {
      if (killSignal) {
        settle(state.aborted ? 130 : state.timedOut ? 124 : 1);
        return;
      }
      settle(code ?? 1);
    });

    child.once("error", () => {
      settle(1);
    });

    signal?.addEventListener("abort", onAbort, { once: true });
  });
};
