import { useSecondTick } from "../hooks/useSecondTick.js";

export const useElapsedSeconds = (startedAt: number | null): number => {
  const now = useSecondTick(startedAt !== null);
  if (startedAt === null) {
    return 0;
  }
  return Math.max(0, Math.floor((now - startedAt) / 1000));
};
