export const getCwd = (): string => process.cwd();

export const setCwd = (path: string): void => {
  process.chdir(path);
};
