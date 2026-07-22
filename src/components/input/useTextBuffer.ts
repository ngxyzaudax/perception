export type TextBuffer = {
  text: string;
  cursor: number;
};

export const createBuffer = (text: string = ""): TextBuffer => ({
  text,
  cursor: text.length,
});

export const insertChar = (buffer: TextBuffer, char: string): TextBuffer => ({
  text: buffer.text.slice(0, buffer.cursor) + char + buffer.text.slice(buffer.cursor),
  cursor: buffer.cursor + char.length,
});

export const insertText = (buffer: TextBuffer, value: string): TextBuffer => ({
  text: buffer.text.slice(0, buffer.cursor) + value + buffer.text.slice(buffer.cursor),
  cursor: buffer.cursor + value.length,
});

export const deleteBeforeCursor = (buffer: TextBuffer): TextBuffer => {
  if (buffer.cursor === 0) {
    return buffer;
  }
  return {
    text: buffer.text.slice(0, buffer.cursor - 1) + buffer.text.slice(buffer.cursor),
    cursor: buffer.cursor - 1,
  };
};

export const deleteAtCursor = (buffer: TextBuffer): TextBuffer => {
  if (buffer.cursor >= buffer.text.length) {
    return buffer;
  }
  return {
    text: buffer.text.slice(0, buffer.cursor) + buffer.text.slice(buffer.cursor + 1),
    cursor: buffer.cursor,
  };
};

export const deleteWordBeforeCursor = (buffer: TextBuffer): TextBuffer => {
  const before = buffer.text.slice(0, buffer.cursor);
  const after = buffer.text.slice(buffer.cursor);
  const trimmed = before.replace(/\s+$/, "");
  const match = trimmed.match(/(?:^|\s)(\S+)$/);
  if (!match) {
    return deleteBeforeCursor(buffer);
  }
  const removeLength = match[0].length;
  const nextCursor = buffer.cursor - removeLength;
  return {
    text: buffer.text.slice(0, nextCursor) + after,
    cursor: Math.max(0, nextCursor),
  };
};

export const deleteToLineStart = (buffer: TextBuffer): TextBuffer => ({
  text: buffer.text.slice(buffer.cursor),
  cursor: 0,
});

export const moveCursorLeft = (buffer: TextBuffer): TextBuffer => ({
  ...buffer,
  cursor: Math.max(0, buffer.cursor - 1),
});

export const moveCursorRight = (buffer: TextBuffer): TextBuffer => ({
  ...buffer,
  cursor: Math.min(buffer.text.length, buffer.cursor + 1),
});

export const moveCursorHome = (buffer: TextBuffer): TextBuffer => ({
  ...buffer,
  cursor: 0,
});

export const moveCursorEnd = (buffer: TextBuffer): TextBuffer => ({
  ...buffer,
  cursor: buffer.text.length,
});

export const replaceBuffer = (buffer: TextBuffer, text: string): TextBuffer => ({
  text,
  cursor: text.length,
});

export const getTokenAtCursor = (buffer: TextBuffer): { token: string; start: number } => {
  const before = buffer.text.slice(0, buffer.cursor);
  const match = before.match(/(?:^|\s)([^\s]*)$/);
  if (!match) {
    return { token: "", start: buffer.cursor };
  }
  const token = match[1] ?? "";
  return { token, start: buffer.cursor - token.length };
};

export const replaceTokenAtCursor = (
  buffer: TextBuffer,
  replacement: string,
): TextBuffer => {
  const { token, start } = getTokenAtCursor(buffer);
  const end = start + token.length;
  const nextText = buffer.text.slice(0, start) + replacement + buffer.text.slice(end);
  const nextCursor = start + replacement.length;
  return { text: nextText, cursor: nextCursor };
};
