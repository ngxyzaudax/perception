import type { ChatMessage } from "../types/messages.js";

const MAX_TOOL_OUTPUT_CHARS = 30000;
const CAP_HEAD_CHARS = 22000;
const CAP_TAIL_CHARS = 6000;
const RECOVERY_HEAD_CHARS = 1600;
const RECOVERY_TAIL_CHARS = 400;
const RECOVERY_THRESHOLD_CHARS = RECOVERY_HEAD_CHARS + RECOVERY_TAIL_CHARS;

const truncateMiddle = (output: string, headChars: number, tailChars: number): string =>
  [
    output.slice(0, headChars),
    `\n[output truncated: ${output.length} chars total, kept first ${headChars} and last ${tailChars}]\n`,
    output.slice(output.length - tailChars),
  ].join("");

export const capToolOutput = (output: string): string =>
  output.length <= MAX_TOOL_OUTPUT_CHARS
    ? output
    : truncateMiddle(output, CAP_HEAD_CHARS, CAP_TAIL_CHARS);

export const shrinkOversizedToolMessages = (messages: ChatMessage[]): ChatMessage[] =>
  messages.map((message) =>
    message.role === "tool" && message.content.length > RECOVERY_THRESHOLD_CHARS
      ? { ...message, content: truncateMiddle(message.content, RECOVERY_HEAD_CHARS, RECOVERY_TAIL_CHARS) }
      : message,
  );
