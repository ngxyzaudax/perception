import { runGit } from "./runGit.js";

export const findGitRoot = async (cwd: string): Promise<string | null> => {
  const result = await runGit(["rev-parse", "--show-toplevel"], cwd, 5000);
  if (result.exitCode !== 0 || result.stdout.length === 0) {
    return null;
  }
  return result.stdout;
};
