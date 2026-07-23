export type RunningTool = {
  name: string;
  startedAt: number;
  elapsedMs: number;
  count: number;
};

type Listener = () => void;

let running: RunningTool[] = [];
const listeners = new Set<Listener>();

const notify = (): void => {
  for (const listener of listeners) {
    listener();
  }
};

export const subscribeRunningTools = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getRunningTools = (): RunningTool[] => running;

export const markToolStarted = (name: string): void => {
  const existing = running.find((tool) => tool.name === name);
  running = existing
    ? running.map((tool) =>
        tool.name === name ? { ...tool, count: tool.count + 1 } : tool,
      )
    : [...running, { name, startedAt: Date.now(), elapsedMs: 0, count: 1 }];
  notify();
};

export const markToolProgress = (name: string, elapsedMs: number): void => {
  running = running.map((tool) =>
    tool.name === name ? { ...tool, elapsedMs } : tool,
  );
  notify();
};

export const markToolEnded = (name: string): void => {
  running = running
    .map((tool) =>
      tool.name === name ? { ...tool, count: tool.count - 1 } : tool,
    )
    .filter((tool) => tool.count > 0);
  notify();
};

export const clearRunningTools = (): void => {
  running = [];
  notify();
};
