import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { z } from "zod";
import { DEFAULT_MAX_TURNS } from "../query/queryEngine.js";
import { partitionToolCalls } from "../query/partitionToolCalls.js";
import { buildTool } from "../Tool.js";
import { createToolRegistry } from "../tools.js";
import { createStreamingDisplay } from "../terminal/streamDisplay.js";
import { compactToolOutput } from "../utils/toolDisplay.js";

describe("query engine", () => {
  it("uses default max turn limit", () => {
    assert.equal(DEFAULT_MAX_TURNS, 100);
  });

  it("partitions read-only and mutating tool batches", () => {
    const readTool = buildTool({
      name: "Read",
      description: "read",
      inputSchema: z.object({ file_path: z.string() }),
      isReadOnly: () => true,
      summarize: (input) => input.file_path,
      call: async () => "ok",
    });
    const writeTool = buildTool({
      name: "Write",
      description: "write",
      inputSchema: z.object({ file_path: z.string(), content: z.string() }),
      isReadOnly: () => false,
      summarize: (input) => input.file_path,
      call: async () => "ok",
    });
    const registry = { Read: readTool, Write: writeTool };
    const batches = partitionToolCalls(
      [
        { id: "1", name: "Read", arguments: '{"file_path":"a.ts"}' },
        { id: "2", name: "Read", arguments: '{"file_path":"b.ts"}' },
        { id: "3", name: "Write", arguments: '{"file_path":"c.ts","content":"x"}' },
      ],
      registry,
    );
    assert.equal(batches.length, 2);
    assert.equal(batches[0]?.concurrent, true);
    assert.equal(batches[1]?.concurrent, false);
  });

  it("batches Agent tool calls concurrently", () => {
    const readTool = buildTool({
      name: "Read",
      description: "read",
      inputSchema: z.object({ file_path: z.string() }),
      isReadOnly: () => true,
      summarize: (input) => input.file_path,
      call: async () => "ok",
    });
    const registry = createToolRegistry();
    registry.Read = readTool;
    const batches = partitionToolCalls(
      [
        { id: "1", name: "Read", arguments: '{"file_path":"a.ts"}' },
        { id: "2", name: "Agent", arguments: '{"description":"x","prompt":"y"}' },
      ],
      registry,
    );
    assert.equal(batches.length, 1);
    assert.equal(batches[0]?.concurrent, true);
  });

  it("compacts long tool output", () => {
    const compact = compactToolOutput("a\nb\nc\nd\ne\nf\ng", 3);
    assert.equal(compact.hiddenLines, 4);
  });

  it("manages streaming display snapshots", () => {
    const display = createStreamingDisplay();
    const initial = display.getSnapshot();
    assert.equal(display.getSnapshot(), initial);
    display.appendThinking("plan");
    display.appendText("hello");
    const snapshot = display.getSnapshot();
    assert.equal(snapshot.thinking, "");
    assert.equal(snapshot.text, "hello");
  });
});
