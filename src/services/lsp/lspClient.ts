import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { StreamMessageReader, StreamMessageWriter } from "vscode-jsonrpc/node.js";
import type { LspOperation } from "./lspTypes.js";
import { pathToUri, toLspPosition } from "./lspTypes.js";

export type LspServerConfig = {
  command: string;
  args?: string[];
  extensionToLanguage: Record<string, string>;
};

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};

export class LspClient {
  private process: ChildProcessWithoutNullStreams | null = null;
  private reader: StreamMessageReader | null = null;
  private writer: StreamMessageWriter | null = null;
  private nextId = 1;
  private openVersions = new Map<string, number>();
  private pending = new Map<number, PendingRequest>();

  constructor(
    private readonly config: LspServerConfig,
    private readonly workspaceRoot: string,
  ) {}

  async start(): Promise<void> {
    if (this.process) {
      return;
    }
    this.process = spawn(this.config.command, this.config.args ?? [], {
      cwd: this.workspaceRoot,
      stdio: "pipe",
      env: process.env,
    });
    this.reader = new StreamMessageReader(this.process.stdout);
    this.writer = new StreamMessageWriter(this.process.stdin);
    this.reader.listen((message) => {
      if (!("id" in message) || message.id === undefined) {
        return;
      }
      const handler = this.pending.get(Number(message.id));
      if (!handler) {
        return;
      }
      this.pending.delete(Number(message.id));
      if ("error" in message && message.error) {
        handler.reject(new Error(String((message.error as { message?: string }).message ?? "lsp error")));
        return;
      }
      handler.resolve("result" in message ? message.result : null);
    });
    await this.request("initialize", {
      rootUri: pathToUri(this.workspaceRoot),
      capabilities: {},
    });
    this.notify("initialized", {});
  }

  async shutdown(): Promise<void> {
    if (!this.process) {
      return;
    }
    try {
      await this.request("shutdown", null);
      this.notify("exit", null);
    } catch {
      return;
    } finally {
      this.process.kill();
      this.process = null;
      this.reader = null;
      this.writer = null;
      this.pending.clear();
    }
  }

  async ensureOpen(path: string, languageId: string, text: string): Promise<void> {
    const uri = pathToUri(path);
    const version = (this.openVersions.get(uri) ?? 0) + 1;
    this.openVersions.set(uri, version);
    this.notify("textDocument/didOpen", {
      textDocument: { uri, languageId, version, text },
    });
  }

  async runOperation(
    operation: LspOperation,
    path: string,
    line: number,
    character: number,
    languageId: string,
    text: string,
  ): Promise<unknown> {
    await this.ensureOpen(path, languageId, text);
    const uri = pathToUri(path);
    const position = toLspPosition(line, character);
    if (operation === "workspaceSymbol") {
      return this.request("workspace/symbol", { query: "" });
    }
    const textDocument = { uri };
    if (operation === "goToDefinition") {
      return this.request("textDocument/definition", { textDocument, position });
    }
    if (operation === "findReferences") {
      return this.request("textDocument/references", {
        textDocument,
        position,
        context: { includeDeclaration: true },
      });
    }
    if (operation === "hover") {
      return this.request("textDocument/hover", { textDocument, position });
    }
    if (operation === "documentSymbol") {
      return this.request("textDocument/documentSymbol", { textDocument });
    }
    return this.request("textDocument/implementation", { textDocument, position });
  }

  private request(method: string, params: unknown): Promise<unknown> {
    if (!this.writer) {
      return Promise.reject(new Error("lsp client not started"));
    }
    const id = this.nextId;
    this.nextId += 1;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`lsp timeout: ${method}`));
      }, 15000);
      this.pending.set(id, {
        resolve: (value) => {
          clearTimeout(timeout);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
      });
      void this.writer?.write({ jsonrpc: "2.0", id, method, params } as never);
    });
  }

  private notify(method: string, params: unknown): void {
    void this.writer?.write({ jsonrpc: "2.0", method, params } as never);
  }
}
