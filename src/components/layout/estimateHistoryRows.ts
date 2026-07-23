import type { DisplayMessage } from "../../types/displayMessages.js";
import { isStatusMessage } from "../../types/displayMessages.js";

const BANNER_ROWS = 5;

const countWrappedRows = (text: string, columns: number): number => {
  const width = Math.max(1, columns);
  return text.split("\n").reduce((rows, line) => {
    const length = Math.max(line.length, 1);
    return rows + Math.max(1, Math.ceil(length / width));
  }, 0);
};

const messageBody = (message: DisplayMessage): string => {
  if (isStatusMessage(message)) {
    return message.content;
  }
  if (message.role === "tool") {
    return message.summary ?? message.content.slice(0, 240);
  }
  return message.content;
};

export const estimateMessageRows = (message: DisplayMessage, columns: number): number => {
  const headerRows = 1;
  const marginRows = 1;
  const borderRows = isStatusMessage(message) ? 2 : 0;
  const bodyRows = countWrappedRows(messageBody(message), columns);
  return headerRows + marginRows + borderRows + bodyRows;
};

export const estimateHistoryRows = (messages: DisplayMessage[], columns: number): number =>
  BANNER_ROWS + messages.reduce((sum, message) => sum + estimateMessageRows(message, columns), 0);
