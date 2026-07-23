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

const FLUSH_MS = 33;

export const createStreamingDisplay = (): StreamingDisplay => {
  let text = "";
  let thinking = "";
  let snapshot: StreamingSnapshot = { text, thinking };
  const listeners = new Set<() => void>();
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  const notify = (): void => {
    listeners.forEach((listener) => listener());
  };

  const syncSnapshot = (): void => {
    if (snapshot.text === text && snapshot.thinking === thinking) {
      return;
    }
    snapshot = { text, thinking };
  };

  const flushNow = (): void => {
    if (flushTimer !== null) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    syncSnapshot();
    notify();
  };

  const scheduleNotify = (): void => {
    if (flushTimer !== null) {
      return;
    }
    flushTimer = setTimeout(() => {
      flushTimer = null;
      syncSnapshot();
      notify();
    }, FLUSH_MS);
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
      scheduleNotify();
    },
    appendThinking: (delta) => {
      thinking += delta;
      scheduleNotify();
    },
    clear: () => {
      text = "";
      thinking = "";
      flushNow();
    },
  };
};
