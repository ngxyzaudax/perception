export type StreamingSnapshot = {
  text: string;
  thinking: string;
  toolPreview: string;
};

export type StreamingDisplay = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => StreamingSnapshot;
  appendText: (delta: string) => void;
  appendThinking: (delta: string) => void;
  setToolPreview: (preview: string) => void;
  clear: () => void;
};

const FLUSH_MS = 33;

export const createStreamingDisplay = (): StreamingDisplay => {
  let text = "";
  let thinking = "";
  let toolPreview = "";
  let snapshot: StreamingSnapshot = { text, thinking, toolPreview };
  const listeners = new Set<() => void>();
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  const notify = (): void => {
    listeners.forEach((listener) => listener());
  };

  const syncSnapshot = (): void => {
    if (
      snapshot.text === text &&
      snapshot.thinking === thinking &&
      snapshot.toolPreview === toolPreview
    ) {
      return;
    }
    snapshot = { text, thinking, toolPreview };
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
    setToolPreview: (preview) => {
      toolPreview = preview;
      scheduleNotify();
    },
    clear: () => {
      text = "";
      thinking = "";
      toolPreview = "";
      flushNow();
    },
  };
};
