import { useEffect, useState } from "react";
import { filterSlashCommands, type SlashCommandDefinition } from "./slashCommands.js";
import {
  filterFileSuggestions,
  searchFileSuggestions,
  type FileSuggestion,
} from "./fileSuggestions.js";
import type { TextBuffer } from "./useTextBuffer.js";
import { getTokenAtCursor } from "./useTextBuffer.js";

export type SuggestionKind = "slash" | "file" | "none";

export type SuggestionState = {
  kind: SuggestionKind;
  slashCommands: SlashCommandDefinition[];
  fileSuggestions: FileSuggestion[];
  selectedIndex: number;
};

export const emptySuggestionState = (): SuggestionState => ({
  kind: "none",
  slashCommands: [],
  fileSuggestions: [],
  selectedIndex: 0,
});

export const useSuggestions = (buffer: TextBuffer): SuggestionState => {
  const [state, setState] = useState<SuggestionState>(emptySuggestionState());

  useEffect(() => {
    const update = async (): Promise<void> => {
      if (buffer.text.startsWith("/") && !buffer.text.includes(" ")) {
        const slashCommands = filterSlashCommands(buffer.text);
        setState({
          kind: slashCommands.length > 0 ? "slash" : "none",
          slashCommands,
          fileSuggestions: [],
          selectedIndex: 0,
        });
        return;
      }
      const { token } = getTokenAtCursor(buffer);
      if (token.startsWith("@")) {
        const files = await searchFileSuggestions(token.slice(1));
        const filtered = filterFileSuggestions(files, token);
        setState({
          kind: filtered.length > 0 ? "file" : "none",
          slashCommands: [],
          fileSuggestions: filtered,
          selectedIndex: 0,
        });
        return;
      }
      setState(emptySuggestionState());
    };
    void update();
  }, [buffer.text, buffer.cursor]);

  return state;
};

export const moveSuggestionSelection = (
  state: SuggestionState,
  direction: "up" | "down",
): SuggestionState => {
  const count =
    state.kind === "slash"
      ? state.slashCommands.length
      : state.kind === "file"
        ? state.fileSuggestions.length
        : 0;
  if (count === 0) {
    return state;
  }
  const delta = direction === "up" ? -1 : 1;
  const nextIndex = (state.selectedIndex + delta + count) % count;
  return { ...state, selectedIndex: nextIndex };
};

export const getSelectedSuggestion = (
  state: SuggestionState,
): string | null => {
  if (state.kind === "slash") {
    return state.slashCommands[state.selectedIndex]?.name ?? null;
  }
  if (state.kind === "file") {
    const path = state.fileSuggestions[state.selectedIndex]?.path;
    return path ? `@${path}` : null;
  }
  return null;
};
