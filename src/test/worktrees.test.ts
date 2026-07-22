import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { createAgentWorktree } from "../services/worktrees/createAgentWorktree.js";
import { finalizeAgentWorktree } from "../services/worktrees/finalizeAgentWorktree.js";
import { validateWorktreeSlug, worktreeBranchName } from "../services/worktrees/worktreePaths.js";
import { runGit } from "../services/worktrees/runGit.js";
import { executeToolCall } from "../query/executeToolCall.js";
import { createPermissionContext } from "../permissions/checkPermission.js";
import { buildTool } from "../Tool.js";
import { z } from "zod";
import type { Settings } from "../schemas/settings.js";

const initGitRepo = async (root: string): Promise<void> => {
  await runGit(["init"], root);
  await runGit(["config", "user.email", "test@example.com"], root);
  await runGit(["config", "user.name", "test"], root);
  await writeFile(join(root, "README.md"), "hello\n", "utf8");
  await runGit(["add", "README.md"], root);
  await runGit(["commit", "-m", "initial"], root);
};

describe("worktree paths", () => {
  it("validates slug segments", () => {
    assert.doesNotThrow(() => validateWorktreeSlug("agent-abc-123"));
    assert.throws(() => validateWorktreeSlug("../escape"));
  });

  it("builds branch names", () => {
    assert.equal(worktreeBranchName("agent-abc"), "agent/agent-abc");
  });
});

describe("agent worktrees", () => {
  it("creates, commits, and finalizes a worktree", async () => {
    const root = await mkdtemp(join(tmpdir(), "perception-worktree-"));
    const previousCwd = process.cwd();
    try {
      await initGitRepo(root);
      process.chdir(root);
      const slug = "agent-test123";
      const created = await createAgentWorktree(slug);
      assert.equal(created.branch, "agent/agent-test123");
      await writeFile(join(created.worktreePath, "feature.txt"), "change\n", "utf8");
      const finalized = await finalizeAgentWorktree({
        worktreePath: created.worktreePath,
        branch: created.branch,
        gitRoot: created.gitRoot,
        headCommit: created.headCommit,
        agentId: slug,
        description: "add feature file",
      });
      assert.equal(finalized.hasChanges, true);
      assert.match(finalized.diffstat, /feature\.txt/);
      assert.equal(finalized.removed, false);
    } finally {
      process.chdir(previousCwd);
      await rm(root, { recursive: true, force: true });
    }
  });

  it("removes clean worktrees with no changes", async () => {
    const root = await mkdtemp(join(tmpdir(), "perception-worktree-clean-"));
    const previousCwd = process.cwd();
    try {
      await initGitRepo(root);
      process.chdir(root);
      const slug = "agent-clean1";
      const created = await createAgentWorktree(slug);
      const finalized = await finalizeAgentWorktree({
        worktreePath: created.worktreePath,
        branch: created.branch,
        gitRoot: created.gitRoot,
        headCommit: created.headCommit,
        agentId: slug,
        description: "no-op",
      });
      assert.equal(finalized.hasChanges, false);
      assert.equal(finalized.removed, true);
    } finally {
      process.chdir(previousCwd);
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("cwd threading", () => {
  it("passes runtime cwd into tool context", async () => {
    const observed: string[] = [];
    const probe = buildTool({
      name: "Probe",
      description: "records cwd",
      inputSchema: z.object({}),
      isReadOnly: () => true,
      summarize: () => "probe",
      call: async (_input, context) => {
        observed.push(context.cwd);
        return context.cwd;
      },
    });
    const settings: Settings = {
      baseUrl: "http://localhost:8000/v1",
      apiKey: "local",
      permissionMode: "bypassPermissions",
      alwaysAllowRules: [],
      webSearchUrls: [],
      hooks: {},
      lspServers: {},
    };
    await executeToolCall({
      call: { id: "1", name: "Probe", arguments: "{}" },
      registry: { Probe: probe },
      settings,
      permissionContext: createPermissionContext("bypassPermissions"),
      runtimeExtras: { cwd: "/tmp/isolated-agent" },
      onEvent: () => {},
    });
    assert.deepEqual(observed, ["/tmp/isolated-agent"]);
  });
});
