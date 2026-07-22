import { useEffect, useState } from "react";

export const useElapsedSeconds = (startedAt: number | null): number => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  useEffect(() => {
    if (startedAt === null) {
      setElapsedSeconds(0);
      return;
    }
    const update = (): void => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    };
    update();
    const timer = setInterval(update, 1000);
    return () => {
      clearInterval(timer);
    };
  }, [startedAt]);
  return elapsedSeconds;
};
