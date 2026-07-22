import { readFile, stat, writeFile } from "node:fs/promises";
import { z } from "zod";
import { buildTool } from "../Tool.js";
import {
  checkFileFreshness,
  recordFileRead,
  resolveFileScope,
  touchFileRead,
} from "../state/readFileState.js";
import { expandPath } from "../utils/path.js";

const inputSchema = z.object({
  notebook_path: z.string().describe("Path to the .ipynb notebook"),
  cell_index: z.number().int().min(0).describe("Zero-based cell index"),
  mode: z.enum(["replace", "insert", "delete"]).describe("Cell edit mode"),
  source: z.string().optional().describe("Cell source for replace or insert"),
});

type NotebookCell = {
  cell_type: string;
  source: string | string[];
  metadata?: Record<string, unknown>;
};

type NotebookDocument = {
  cells: NotebookCell[];
  metadata?: Record<string, unknown>;
  nbformat?: number;
  nbformat_minor?: number;
};

export const NotebookEditTool = buildTool({
  name: "NotebookEdit",
  description: "Replace, insert, or delete a cell in a Jupyter notebook",
  inputSchema,
  isReadOnly: () => false,
  summarize: (input) => `${input.mode} ${input.notebook_path}:${input.cell_index}`,
  call: async (input, context) => {
    const path = expandPath(input.notebook_path, context.cwd);
    const scope = resolveFileScope(context.runtime?.agentScope);
    const freshness = await checkFileFreshness(path, scope);
    if (freshness) {
      return freshness;
    }
    const raw = await readFile(path, "utf8");
    const notebook = JSON.parse(raw) as NotebookDocument;
    if (!Array.isArray(notebook.cells)) {
      return "Invalid notebook: cells array missing";
    }
    if (input.mode === "delete") {
      if (input.cell_index >= notebook.cells.length) {
        return `Cell index ${input.cell_index} out of range`;
      }
      notebook.cells.splice(input.cell_index, 1);
    } else if (input.mode === "insert") {
      if (input.source === undefined) {
        return "Insert mode requires source";
      }
      notebook.cells.splice(input.cell_index, 0, {
        cell_type: "code",
        source: input.source,
        metadata: {},
      });
    } else {
      if (input.source === undefined) {
        return "Replace mode requires source";
      }
      const cell = notebook.cells[input.cell_index];
      if (!cell) {
        return `Cell index ${input.cell_index} out of range`;
      }
      notebook.cells[input.cell_index] = {
        ...cell,
        source: input.source,
      };
    }
    await writeFile(path, `${JSON.stringify(notebook, null, 1)}\n`, "utf8");
    await touchFileRead(path, scope);
    return `Updated ${input.notebook_path} (${input.mode} cell ${input.cell_index})`;
  },
});

export const recordNotebookRead = async (path: string, scope: string = "main"): Promise<void> => {
  const fileStat = await stat(path);
  recordFileRead(path, fileStat.mtimeMs, scope);
};
