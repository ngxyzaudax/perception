import { useCallback, useState } from "react";

export type HistorySearchState = {
  active: boolean;
  query: string;
  match: string | null;
};

export type SearchKey = {
  escape?: boolean;
  return?: boolean;
  ctrl?: boolean;
  meta?: boolean;
  backspace?: boolean;
  delete?: boolean;
};

export type HistorySearchController = {
  state: HistorySearchState;
  start: () => void;
  cancel: () => void;
  handleKey: (input: string, key: SearchKey) => void;
};

const inactiveState: HistorySearchState = { active: false, query: "", match: null };

const findMatch = (
  history: string[],
  query: string,
  beforeIndex: number,
): { entry: string; index: number } | null => {
  for (let position = Math.min(beforeIndex, history.length - 1); position >= 0; position -= 1) {
    const entry = history[position] ?? "";
    if (query.length === 0 || entry.includes(query)) {
      return { entry, index: position };
    }
  }
  return null;
};

export const useHistorySearch = (
  history: string[],
  onAccept: (entry: string) => void,
): HistorySearchController => {
  const [state, setState] = useState<HistorySearchState>(inactiveState);
  const [matchIndex, setMatchIndex] = useState<number>(-1);

  const applyQuery = useCallback(
    (query: string, beforeIndex: number): void => {
      const found = findMatch(history, query, beforeIndex);
      setMatchIndex(found?.index ?? -1);
      setState({ active: true, query, match: found?.entry ?? null });
    },
    [history],
  );

  const start = useCallback((): void => {
    applyQuery("", history.length - 1);
  }, [applyQuery, history.length]);

  const cancel = useCallback((): void => {
    setState(inactiveState);
  }, []);

  const handleKey = useCallback(
    (input: string, key: SearchKey): void => {
      if (key.escape) {
        cancel();
        return;
      }
      if (key.return) {
        if (state.match) {
          onAccept(state.match);
        }
        cancel();
        return;
      }
      if (key.ctrl && input === "r") {
        applyQuery(state.query, matchIndex - 1);
        return;
      }
      if (key.backspace || key.delete) {
        applyQuery(state.query.slice(0, -1), history.length - 1);
        return;
      }
      if (input.length > 0 && !key.ctrl && !key.meta) {
        applyQuery(state.query + input, history.length - 1);
      }
    },
    [applyQuery, cancel, history.length, matchIndex, onAccept, state.match, state.query],
  );

  return { state, start, cancel, handleKey };
};
