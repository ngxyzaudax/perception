import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { runHookEvent } from "../services/hooks/runHooks.js";
import { registerTask, getTask, formatTaskList } from "../state/backgroundTasks.js";
import { checkFileFreshness, recordFileRead } from "../state/readFileState.js";
import { buildLineDiff } from "../utils/diffLines.js";

describe("hooks", () => {
  it("denies tool use when hook exits with code 2", async () => {
    const root = await mkdtemp(join(tmpdir(), "perception-hook-"));
    const scriptPath = join(root, "deny.sh");
    await writeFile(scriptPath, 'echo "blocked by hook" >&2; exit 2', "utf8");
    const result = await runHookEvent(
      {
        PreToolUse: [{ hooks: [{ type: "command", command: `bash ${scriptPath}` }] }],
      },
      { event: "PreToolUse", toolName: "Bash", summary: "echo hi", cwd: process.cwd() },
    );
    assert.ok(!result.allowed);
    await rm(root, { recursive: true, force: true });
  });
});

describe("tools", () => {
  it("blocks edits without prior read", async () => {
    const root = await mkdtemp(join(tmpdir(), "perception-fresh-"));
    const filePath = join(root, "demo.txt");
    await writeFile(filePath, "alpha", "utf8");
    assert.ok(await checkFileFreshness(filePath));
    const fileStat = await stat(filePath);
    recordFileRead(filePath, fileStat.mtimeMs);
    assert.equal(await checkFileFreshness(filePath), null);
    await rm(root, { recursive: true, force: true });
  });

  it("builds line diffs", () => {
    const lines = buildLineDiff("a\nb", "a\nc");
    assert.ok(lines.some((line) => line.type === "remove"));
    assert.ok(lines.some((line) => line.type === "add"));
  });

  it("registers background shell tasks", () => {
    registerTask({
      id: "task-demo",
      command: "sleep 1",
      pid: 12345,
      status: "running",
      outputPath: "/tmp/task-demo.txt",
      sessionId: "session-demo",
      startedAt: new Date().toISOString(),
    });
    assert.ok(getTask("task-demo"));
    assert.match(formatTaskList("session-demo"), /task-demo/);
  });

  it("edits notebook cells", async () => {
    const root = await mkdtemp(join(tmpdir(), "perception-notebook-"));
    const notebookPath = join(root, "demo.ipynb");
    await writeFile(
      notebookPath,
      JSON.stringify({ cells: [{ cell_type: "code", source: "print(1)", metadata: {} }] }),
      "utf8",
    );
    const { NotebookEditTool } = await import("../tools/NotebookEditTool.js");
    const { recordFileRead } = await import("../state/readFileState.js");
    recordFileRead(notebookPath, (await stat(notebookPath)).mtimeMs);
    const output = await NotebookEditTool.call(
      { notebook_path: notebookPath, cell_index: 0, mode: "replace", source: "print(2)" },
      { cwd: root, abortSignal: new AbortController().signal },
    );
    assert.match(output, /Updated/);
    const raw = await readFile(notebookPath, "utf8");
    assert.match(raw, /print\(2\)/);
    await rm(root, { recursive: true, force: true });
  });

  it("expands file mentions", async () => {
    const root = await mkdtemp(join(tmpdir(), "perception-mention-"));
    const filePath = join(root, "demo.txt");
    await writeFile(filePath, "mention-content", "utf8");
    const { expandFileMentions } = await import("../utils/fileMentions.js");
    const expanded = await expandFileMentions(`see @${filePath}`, root);
    assert.equal(expanded.attachments.length, 1);
    const missing = await expandFileMentions("@missing.txt", root);
    assert.equal(missing.attachments.length, 0);
    await rm(root, { recursive: true, force: true });
  });
});
