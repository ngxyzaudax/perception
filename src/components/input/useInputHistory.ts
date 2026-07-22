import { useCallback, useEffect, useRef, useState } from "react";
import { loadInputHistory, persistInputHistoryEntry } from "../../state/inputHistory.js";

export type InputHistoryController = {
  history: string[];
  navigateUp: (currentText: string) => string | null;
  navigateDown: () => string | null;
  resetNavigation: () => void;
  record: (entry: string) => void;
};

export const useInputHistory = (): InputHistoryController => {
  const [history, setHistory] = useState<string[]>([]);
  const [index, setIndex] = useState<number | null>(null);
  const draftRef = useRef("");

  useEffect(() => {
    void loadInputHistory().then(setHistory);
  }, []);

  const navigateUp = useCallback(
    (currentText: string): string | null => {
      if (history.length === 0) {
        return null;
      }
      if (index === null) {
        draftRef.current = currentText;
        setIndex(history.length - 1);
        return history[history.length - 1] ?? null;
      }
      if (index > 0) {
        setIndex(index - 1);
        return history[index - 1] ?? null;
      }
      return null;
    },
    [history, index],
  );

  const navigateDown = useCallback((): string | null => {
    if (index === null) {
      return null;
    }
    if (index >= history.length - 1) {
      setIndex(null);
      return draftRef.current;
    }
    setIndex(index + 1);
    return history[index + 1] ?? null;
  }, [history, index]);

  const resetNavigation = useCallback((): void => {
    setIndex(null);
    draftRef.current = "";
  }, []);

  const record = useCallback((entry: string): void => {
    setHistory((current) => [...current, entry]);
    void persistInputHistoryEntry(entry);
  }, []);

  return { history, navigateUp, navigateDown, resetNavigation, record };
};
