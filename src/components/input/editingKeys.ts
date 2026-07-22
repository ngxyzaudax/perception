import {
  deleteBeforeCursor,
  deleteToLineStart,
  deleteWordBeforeCursor,
  insertChar,
  moveCursorEnd,
  moveCursorHome,
  moveCursorLeft,
  moveCursorRight,
  type TextBuffer,
} from "./useTextBuffer.js";

export type EditingKey = {
  ctrl?: boolean;
  meta?: boolean;
  leftArrow?: boolean;
  rightArrow?: boolean;
  backspace?: boolean;
  delete?: boolean;
};

export const applyEditingKey = (
  buffer: TextBuffer,
  input: string,
  key: EditingKey,
): TextBuffer | null => {
  if (key.leftArrow) {
    return moveCursorLeft(buffer);
  }
  if (key.rightArrow) {
    return moveCursorRight(buffer);
  }
  if (key.ctrl && input === "a") {
    return moveCursorHome(buffer);
  }
  if (key.ctrl && input === "e") {
    return moveCursorEnd(buffer);
  }
  if (key.ctrl && input === "u") {
    return deleteToLineStart(buffer);
  }
  if (key.ctrl && input === "w") {
    return deleteWordBeforeCursor(buffer);
  }
  if (key.backspace || key.delete) {
    return deleteBeforeCursor(buffer);
  }
  if (input.length > 0 && !key.ctrl && !key.meta) {
    return insertChar(buffer, input);
  }
  return null;
};
