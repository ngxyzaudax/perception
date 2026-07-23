import { useEffect, useState } from "react";

type TickListener = () => void;

const listeners = new Set<TickListener>();
let timer: ReturnType<typeof setInterval> | null = null;

const startTimer = (): void => {
  if (timer !== null) {
    return;
  }
  timer = setInterval(() => {
    listeners.forEach((listener) => listener());
  }, 1000);
};

const stopTimer = (): void => {
  if (timer === null) {
    return;
  }
  clearInterval(timer);
  timer = null;
};

export const useSecondTick = (enabled: boolean): number => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const listener = (): void => {
      setNow(Date.now());
    };
    listeners.add(listener);
    startTimer();
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        stopTimer();
      }
    };
  }, [enabled]);

  return now;
};
