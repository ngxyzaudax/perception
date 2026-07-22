import { useInput } from "ink";
import { useRef } from "react";
import { applyEditingKey } from "./editingKeys.js";
import type { InputHistoryController } from "./useInputHistory.js";
import type { HistorySearchController } from "./useHistorySearch.js";
import {
  createBuffer,
  deleteBeforeCursor,
  insertText,
  replaceBuffer,
  replaceTokenAtCursor,
  type TextBuffer,
} from "./useTextBuffer.js";
import {
  getSelectedSuggestion,
  moveSuggestionSelection,
  type SuggestionState,
} from "./useSuggestions.js";

type InkKey = Parameters<Parameters<typeof useInput>[0]>[1];

type InputKeysArgs = {
  disabled: boolean;
  queueMode: boolean;
  buffer: TextBuffer;
  setBuffer: React.Dispatch<React.SetStateAction<TextBuffer>>;
  activeSuggestions: SuggestionState;
  setSuggestionOverride: React.Dispatch<React.SetStateAction<SuggestionState | null>>;
  history: InputHistoryController;
  search: HistorySearchController;
  onSubmit: (value: string) => void;
  onQueue: (value: string) => void;
  onExitRequest: () => void;
};

const doublePressWindowMs = 400;

export const useInputKeys = (args: InputKeysArgs): void => {
  const lastEscRef = useRef(0);
  const lastCtrlCRef = useRef(0);

  const applySuggestion = (): void => {
    const selected = getSelectedSuggestion(args.activeSuggestions);
    if (!selected) {
      return;
    }
    if (args.activeSuggestions.kind === "slash") {
      args.setBuffer(replaceBuffer(createBuffer(), selected));
    } else {
      args.setBuffer((current) => replaceTokenAtCursor(current, selected));
    }
    args.setSuggestionOverride(null);
  };

  const handleSubmitKey = (): void => {
    if (args.buffer.text.endsWith("\\")) {
      args.setBuffer((current) => insertText(deleteBeforeCursor(current), "\n"));
      return;
    }
    if (
      args.activeSuggestions.kind === "slash" &&
      getSelectedSuggestion(args.activeSuggestions) !== null &&
      getSelectedSuggestion(args.activeSuggestions) !== args.buffer.text
    ) {
      applySuggestion();
      return;
    }
    const trimmed = args.buffer.text.trim();
    if (trimmed.length > 0) {
      if (args.queueMode) {
        args.onQueue(trimmed);
      } else {
        args.history.record(trimmed);
        args.onSubmit(trimmed);
      }
    }
    args.setBuffer(createBuffer());
    args.history.resetNavigation();
    args.setSuggestionOverride(null);
  };

  const handleArrowKey = (key: InkKey): void => {
    if (args.activeSuggestions.kind !== "none") {
      args.setSuggestionOverride(
        moveSuggestionSelection(args.activeSuggestions, key.upArrow ? "up" : "down"),
      );
      return;
    }
    const entry = key.upArrow ? args.history.navigateUp(args.buffer.text) : args.history.navigateDown();
    if (entry !== null) {
      args.setBuffer(replaceBuffer(createBuffer(), entry));
    }
  };

  useInput((input, key) => {
    if (args.disabled && !args.queueMode) {
      return;
    }
    if (args.search.state.active) {
      args.search.handleKey(input, key);
      return;
    }
    if (key.ctrl && input === "r") {
      args.search.start();
      return;
    }
    if (key.escape) {
      const now = Date.now();
      if (now - lastEscRef.current < doublePressWindowMs) {
        args.setBuffer(createBuffer());
        args.setSuggestionOverride(null);
      }
      lastEscRef.current = now;
      return;
    }
    if (key.ctrl && input === "c") {
      const now = Date.now();
      if (now - lastCtrlCRef.current < doublePressWindowMs) {
        args.onExitRequest();
      }
      lastCtrlCRef.current = now;
      return;
    }
    if (key.tab || input === "\t") {
      if (args.activeSuggestions.kind !== "none") {
        applySuggestion();
      }
      return;
    }
    if (key.upArrow || key.downArrow) {
      handleArrowKey(key);
      return;
    }
    if (key.return) {
      handleSubmitKey();
      return;
    }
    const edited = applyEditingKey(args.buffer, input, key);
    if (edited !== null) {
      args.setBuffer(edited);
      args.setSuggestionOverride(null);
    }
  });
};
