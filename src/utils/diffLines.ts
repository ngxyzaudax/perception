import { diffLines } from "diff";

export type DiffLine = {
  type: "add" | "remove" | "context";
  text: string;
};

export type DiffPreview = {
  oldContent: string;
  newContent: string;
};

export const buildLineDiff = (oldContent: string, newContent: string): DiffLine[] => {
  const parts = diffLines(oldContent, newContent);
  const lines: DiffLine[] = [];
  for (const part of parts) {
    const split = part.value.replace(/\n$/, "").split("\n");
    for (const text of split) {
      if (part.added) {
        lines.push({ type: "add", text });
      } else if (part.removed) {
        lines.push({ type: "remove", text });
      } else {
        lines.push({ type: "context", text });
      }
    }
  }
  return lines;
};

export const trimDiffLines = (lines: DiffLine[], context: number = 3): DiffLine[] => {
  const changed = new Set<number>();
  lines.forEach((line, index) => {
    if (line.type !== "context") {
      for (let offset = -context; offset <= context; offset += 1) {
        changed.add(index + offset);
      }
    }
  });
  return lines.filter((_, index) => changed.has(index));
};
