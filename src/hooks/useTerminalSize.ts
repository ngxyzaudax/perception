import { useStdout } from "ink";
import { useEffect, useState } from "react";

export type TerminalSize = {
  rows: number;
  columns: number;
};

const readSize = (stdout: NodeJS.WriteStream | undefined): TerminalSize => ({
  rows: stdout?.rows ?? 24,
  columns: stdout?.columns ?? 80,
});

export const useTerminalSize = (): TerminalSize => {
  const { stdout } = useStdout();
  const [size, setSize] = useState<TerminalSize>(() => readSize(stdout));

  useEffect(() => {
    if (!stdout) {
      return;
    }
    const onResize = (): void => {
      setSize(readSize(stdout));
    };
    onResize();
    stdout.on("resize", onResize);
    return () => {
      stdout.off("resize", onResize);
    };
  }, [stdout]);

  return size;
};
