export const isContextOverflowError = (error: unknown): boolean =>
  error instanceof Error &&
  /maximum context length|context_length_exceeded|input_tokens/i.test(error.message);
