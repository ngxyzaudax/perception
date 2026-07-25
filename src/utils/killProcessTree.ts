import treeKill from "tree-kill";

export const killProcessTree = (
  pid: number,
  signal: NodeJS.Signals = "SIGKILL",
): Promise<void> =>
  new Promise((resolve) => {
    treeKill(pid, signal, () => {
      resolve();
    });
  });
