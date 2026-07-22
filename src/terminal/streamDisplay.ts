export type StreamingSnapshot = {
  text: string;
  thinking: string;
};

export type StreamingDisplay = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => StreamingSnapshot;
  appendText: (delta: string) => void;
  appendThinking: (delta: string) => void;
  clear: () => void;
};

export const createStreamingDisplay = (): StreamingDisplay => {
  let text = "";
  let thinking = "";
  let snapshot: StreamingSnapshot = { text, thinking };
  const listeners = new Set<() => void>();

  const notify = (): void => {
    listeners.forEach((listener) => listener());
  };

  const syncSnapshot = (): void => {
    if (snapshot.text === text && snapshot.thinking === thinking) {
      return;
    }
    snapshot = { text, thinking };
  };

  return {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => {
      syncSnapshot();
      return snapshot;
    },
    appendText: (delta) => {
      thinking = "";
      text += delta;
      syncSnapshot();
      notify();
    },
    appendThinking: (delta) => {
      thinking += delta;
      syncSnapshot();
      notify();
    },
    clear: () => {
      text = "";
      thinking = "";
      syncSnapshot();
      notify();
    },
  };
};
