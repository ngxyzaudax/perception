export type ClampedText = {
  visible: string;
  truncated: boolean;
};

const terminalColumns = (): number => Math.max(20, (process.stdout.columns ?? 80) - 4);

const estimateRows = (line: string, columns: number): number =>
  Math.max(1, Math.ceil(line.length / columns));

export const clampToTailRows = (text: string, maxRows: number): ClampedText => {
  const columns = terminalColumns();
  const lines = text.split("\n");
  const kept: string[] = [];
  let rows = 0;
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index] ?? "";
    const lineRows = estimateRows(line, columns);
    if (rows + lineRows > maxRows) {
      const remainingRows = maxRows - rows;
      if (remainingRows > 0) {
        kept.unshift(line.slice(line.length - remainingRows * columns));
      }
      return { visible: kept.join("\n"), truncated: true };
    }
    kept.unshift(line);
    rows += lineRows;
  }
  return { visible: kept.join("\n"), truncated: false };
};
