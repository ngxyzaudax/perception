import { z } from "zod";
import { buildTool } from "../Tool.js";
import { runLspOperation } from "../services/lsp/lspManager.js";

const inputSchema = z.object({
  operation: z.enum([
    "goToDefinition",
    "findReferences",
    "hover",
    "documentSymbol",
    "workspaceSymbol",
    "goToImplementation",
  ]),
  file_path: z.string().describe("Path to the source file"),
  line: z.number().int().positive().describe("1-based line number"),
  character: z.number().int().positive().describe("1-based character number"),
});

export const LspTool = buildTool({
  name: "LSP",
  description: "Query a configured language server for definitions, references, and symbols",
  inputSchema,
  isReadOnly: () => true,
  summarize: (input) => `${input.operation} ${input.file_path}`,
  call: async (input, context) => {
    if (!context.runtime) {
      return "LSP runtime unavailable";
    }
    return runLspOperation(
      context.runtime.settings,
      context.cwd,
      input.operation,
      input.file_path,
      input.line,
      input.character,
    );
  },
});
