export type RateLimitedStatusSetter = (status: string) => void;

export const createRateLimitedStatusSetter = (
  setter: (status: string) => void,
  intervalMs = 33,
): RateLimitedStatusSetter => {
  let last = "";
  let pending: string | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = (): void => {
    timer = null;
    if (pending === null || pending === last) {
      pending = null;
      return;
    }
    last = pending;
    pending = null;
    setter(last);
  };

  return (status: string): void => {
    if (status === last) {
      return;
    }
    pending = status;
    if (timer === null) {
      timer = setTimeout(flush, intervalMs);
    }
  };
};
