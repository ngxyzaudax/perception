import { z } from "zod";
import { buildTool } from "../Tool.js";

const inputSchema = z.object({
  duration_seconds: z
    .number()
    .int()
    .positive()
    .describe("Seconds to sleep, clamped to 600"),
});

export const SleepTool = buildTool({
  name: "Sleep",
  description: "Wait for a duration without holding a shell process",
  inputSchema,
  isReadOnly: () => true,
  summarize: (input) => `${input.duration_seconds}s`,
  call: async (input, context) => {
    const seconds = Math.min(Math.max(input.duration_seconds, 1), 600);
    const started = Date.now();
    await sleepMs(seconds * 1000, context.abortSignal);
    const elapsed = Math.round((Date.now() - started) / 1000);
    return `Slept ${elapsed}s`;
  },
});

const sleepMs = (durationMs: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error("sleep aborted"));
      return;
    }
    const timer = setTimeout(resolve, durationMs);
    const onAbort = (): void => {
      clearTimeout(timer);
      reject(new Error("sleep aborted"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
