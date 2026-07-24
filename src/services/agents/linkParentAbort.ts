export const linkParentAbort = (
  parent: AbortSignal,
  child: AbortController,
  runInBackground: boolean,
): (() => void) => {
  if (runInBackground) {
    return () => undefined;
  }
  const onParentAbort = (): void => {
    if (!child.signal.aborted) {
      child.abort(parent.reason ?? "user-cancel");
    }
  };
  if (parent.aborted) {
    onParentAbort();
    return () => undefined;
  }
  parent.addEventListener("abort", onParentAbort, { once: true });
  return (): void => {
    parent.removeEventListener("abort", onParentAbort);
  };
};
