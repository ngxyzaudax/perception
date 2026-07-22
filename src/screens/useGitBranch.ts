import { useEffect, useState } from "react";
import { runShell } from "../utils/shell.js";

export const useGitBranch = (intervalMs: number = 10000): string | null => {
  const [branch, setBranch] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const poll = async (): Promise<void> => {
      const result = await runShell("git rev-parse --abbrev-ref HEAD 2>/dev/null", 3000);
      if (!active) {
        return;
      }
      const name = result.stdout.trim();
      setBranch(result.exitCode === 0 && name.length > 0 ? name : null);
    };
    void poll();
    const timer = setInterval(() => {
      void poll();
    }, intervalMs);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [intervalMs]);

  return branch;
};
