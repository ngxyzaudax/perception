import type { Run, RunResult } from "@cursor/sdk";

export const waitRunWithAbort = async (
  run: Run,
  signal?: AbortSignal,
): Promise<RunResult> => {
  if (!signal) {
    return run.wait();
  }
  if (signal.aborted) {
    await cancelRunIfSupported(run);
    return run.wait();
  }
  return new Promise((resolve) => {
    const onAbort = (): void => {
      cleanup();
      void cancelRunIfSupported(run).then(() => run.wait().then(resolve));
    };
    const cleanup = (): void => {
      signal.removeEventListener("abort", onAbort);
    };
    signal.addEventListener("abort", onAbort, { once: true });
    void run.wait().then((result) => {
      cleanup();
      resolve(result);
    });
  });
};

const cancelRunIfSupported = async (run: Run): Promise<void> => {
  if (run.supports("cancel")) {
    await run.cancel();
  }
};
