import vm from "node:vm";

export type VmRunResult = {
  result: unknown;
  stdout: string;
  stderr: string;
};

type VmSession = {
  context: vm.Context;
  stdout: string[];
  stderr: string[];
};

const sessions = new Map<string, VmSession>();

export const resetVmSession = (sessionId: string): void => {
  sessions.delete(sessionId);
};

export const runVmCode = (
  sessionId: string,
  code: string,
  timeoutMs: number,
): VmRunResult => {
  const session = getOrCreateSession(sessionId);
  session.stdout.length = 0;
  session.stderr.length = 0;
  const script = new vm.Script(code, { filename: "repl.js" });
  const result = script.runInContext(session.context, { timeout: timeoutMs });
  return {
    result,
    stdout: session.stdout.join("\n"),
    stderr: session.stderr.join("\n"),
  };
};

const getOrCreateSession = (sessionId: string): VmSession => {
  const existing = sessions.get(sessionId);
  if (existing) {
    return existing;
  }
  const stdout: string[] = [];
  const stderr: string[] = [];
  const context = vm.createContext({
    console: buildConsole(stdout, stderr),
    setTimeout,
    clearTimeout,
    Promise,
    JSON,
    Math,
    Date,
    Array,
    Object,
    Map,
    Set,
  });
  const session: VmSession = { context, stdout, stderr };
  sessions.set(sessionId, session);
  return session;
};

const buildConsole = (stdout: string[], stderr: string[]) => ({
  log: (...args: unknown[]): void => {
    stdout.push(formatArgs(args));
  },
  info: (...args: unknown[]): void => {
    stdout.push(formatArgs(args));
  },
  warn: (...args: unknown[]): void => {
    stderr.push(formatArgs(args));
  },
  error: (...args: unknown[]): void => {
    stderr.push(formatArgs(args));
  },
  debug: (...args: unknown[]): void => {
    stdout.push(formatArgs(args));
  },
});

const formatArgs = (args: unknown[]): string =>
  args
    .map((arg) => {
      if (typeof arg === "string") {
        return arg;
      }
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    })
    .join(" ");
