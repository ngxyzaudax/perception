import type { ChatMessage, QueryEvent } from "../types/messages.js";
import type { QueryResult } from "./queryTypes.js";

export const nextAgenticTurn = (turnCount: number): number => turnCount + 1;

export const hasReachedTurnLimit = (
  maxTurns: number | undefined,
  nextTurnCount: number,
): maxTurns is number => maxTurns !== undefined && nextTurnCount > maxTurns;

export const parsePositiveTurnLimit = (
  value: string | undefined,
): number | undefined => {
  if (value === undefined) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

export const emitMaxTurnsReached = (
  maxTurns: number,
  turnCount: number,
  onEvent: (event: QueryEvent) => void,
): void => {
  onEvent({ type: "max_turns_reached", maxTurns, turnCount });
};

export const createMaxTurnsResult = (
  messages: ChatMessage[],
  maxTurns: number,
  turnCount: number,
  onEvent: (event: QueryEvent) => void,
): QueryResult => {
  emitMaxTurnsReached(maxTurns, turnCount, onEvent);
  return { messages, reason: "max_turns", turnCount, maxTurns };
};
