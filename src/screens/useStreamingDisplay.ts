import { useRef, useSyncExternalStore } from "react";
import { createStreamingDisplay } from "../terminal/streamDisplay.js";

export type StreamingDisplayController = {
  streamingText: string;
  thinkingText: string;
  toolPreview: string;
  appendText: (delta: string) => void;
  appendThinking: (delta: string) => void;
  setToolPreview: (preview: string) => void;
  clear: () => void;
};

export const useStreamingDisplay = (): StreamingDisplayController => {
  const displayRef = useRef<ReturnType<typeof createStreamingDisplay> | null>(null);
  if (displayRef.current === null) {
    displayRef.current = createStreamingDisplay();
  }
  const display = displayRef.current;
  const snapshot = useSyncExternalStore(display.subscribe, display.getSnapshot, display.getSnapshot);

  return {
    streamingText: snapshot.text,
    thinkingText: snapshot.thinking,
    toolPreview: snapshot.toolPreview,
    appendText: display.appendText,
    appendThinking: display.appendThinking,
    setToolPreview: display.setToolPreview,
    clear: display.clear,
  };
};
