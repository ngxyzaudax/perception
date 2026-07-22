import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { readReasoningContent } from "../services/llm/reasoning.js";
import {
  createCheckpoint,
  getShadowRepoStatus,
  restoreCheckpoint,
} from "../services/checkpoints/shadowRepo.js";
import {
  clearTrackedCheckpoints,
  listTrackedCheckpoints,
  recordCheckpoint,
} from "../services/checkpoints/checkpointState.js";
import { buildInitPrompt, compactToolOutput } from "../utils/toolDisplay.js";

describe("checkpoints", () => {
  it("parses reasoning content from model deltas", () => {
    assert.equal(readReasoningContent({ reasoning_content: "plan step" }), "plan step");
    assert.equal(readReasoningContent({ content: "hi" }), undefined);
  });

  it("compacts tool output previews", () => {
    const compact = compactToolOutput("line1\nline2\nline3\nline4\nline5\nline6\nline7", 6);
    assert.equal(compact.hiddenLines, 1);
    assert.match(compact.preview, /line6/);
  });

  it("builds init prompt", () => {
    const prompt = buildInitPrompt();
    assert.match(prompt, /Glob/);
    assert.match(prompt, /brief/);
  });

  it("tracks checkpoint metadata", () => {
    clearTrackedCheckpoints();
    recordCheckpoint(
      { sha: "abc123", label: "first prompt", timestamp: new Date().toISOString() },
      2,
    );
    assert.equal(listTrackedCheckpoints().length, 1);
    assert.equal(listTrackedCheckpoints()[0]?.messageCount, 2);
    clearTrackedCheckpoints();
  });

  it("reports shadow repo availability", async () => {
    const status = await getShadowRepoStatus();
    assert.equal(typeof status.enabled, "boolean");
  });

  it("creates and restores shadow repo checkpoints", async () => {
    const root = await mkdtemp(join(tmpdir(), "perception-checkpoint-"));
    process.env.PERCEPTION_HOME = join(root, "home");
    const workTree = join(root, "project");
    await mkdir(workTree, { recursive: true });
    const originalCwd = process.cwd();
    process.chdir(workTree);
    try {
      const filePath = join(workTree, "demo.txt");
      await writeFile(filePath, "alpha", "utf8");
      const first = await createCheckpoint("alpha snapshot");
      assert.ok(first);
      await writeFile(filePath, "beta", "utf8");
      const restored = first ? await restoreCheckpoint(first.sha) : false;
      assert.ok(restored);
      const content = await readFile(filePath, "utf8");
      assert.equal(content, "alpha");
    } finally {
      process.chdir(originalCwd);
      delete process.env.PERCEPTION_HOME;
      await rm(root, { recursive: true, force: true });
    }
  });
});
