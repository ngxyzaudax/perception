import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  checkToolPermission,
  createPermissionContext,
  setPermissionMode,
} from "../permissions/checkPermission.js";
import { isDangerousPersistRule, sanitizePersistRule } from "../permissions/dangerousRules.js";
import { isDomainAllowed } from "../permissions/domains.js";
import { checkPathSafety } from "../permissions/pathSafety.js";
import { suggestPersistRule } from "../permissions/persistRule.js";
import { matchesRule } from "../permissions/rules.js";
import {
  getAutoCompactThreshold,
  shouldAutoCompact,
} from "../services/compact/autoCompact.js";
import { isDangerousBashCommand } from "../tools/BashTool.js";

describe("permissions", () => {
  it("matches wildcard allow rules", () => {
    assert.ok(matchesRule("Bash(git *)", "Bash", "git status"));
    assert.ok(!matchesRule("Bash(git *)", "Bash", "rm -rf /"));
  });

  it("grants always-allow rules without prompt", async () => {
    const granted = await checkToolPermission(
      createPermissionContext("default", ["Bash(git *)"]),
      "Bash",
      "git status",
      false,
    );
    assert.ok(granted.granted);
  });

  it("denies matching deny rules even in bypass mode", async () => {
    const result = await checkToolPermission(
      createPermissionContext({
        mode: "bypassPermissions",
        denyRules: ["Bash(rm *)"],
      }),
      "Bash",
      "rm -rf ./tmp",
      false,
    );
    assert.equal(result.granted, false);
  });

  it("mutates permission mode in place for mid-turn toggles", async () => {
    const context = createPermissionContext("default");
    let prompted = false;
    context.requestPermission = async () => {
      prompted = true;
      return { granted: false, reason: "should not prompt" };
    };
    setPermissionMode(context, "bypassPermissions");
    const result = await checkToolPermission(context, "Bash", "echo hi", false);
    assert.equal(context.mode, "bypassPermissions");
    assert.ok(result.granted);
    assert.equal(prompted, false);
  });

  it("rejects over-broad persist rules", () => {
    assert.ok(isDangerousPersistRule("Bash"));
    assert.ok(isDangerousPersistRule("Bash(*)"));
    assert.ok(isDangerousPersistRule("Bash(rm *)"));
    assert.equal(sanitizePersistRule("Bash(git *)"), "Bash(git *)");
  });

  it("suggests scoped bash persist rules", () => {
    assert.equal(suggestPersistRule("Bash", "git status --short"), "Bash(git *)");
  });

  it("blocks paths outside cwd", () => {
    const safety = checkPathSafety("/tmp/outside.txt", "/home/user/project");
    assert.equal(safety.ok, false);
  });

  it("marks sensitive paths for forced ask", () => {
    const safety = checkPathSafety("/home/user/project/.git/config", "/home/user/project");
    assert.ok(safety.ok);
    assert.equal(safety.sensitive, true);
  });

  it("marks project .perception config as sensitive", () => {
    const safety = checkPathSafety(
      "/home/user/project/.perception/settings.json",
      "/home/user/project",
    );
    assert.ok(safety.ok);
    assert.equal(safety.sensitive, true);
  });

  it("exempts agent worktree paths from .perception sensitivity", () => {
    const cwd = "/home/user/project/.perception/worktrees/agent-abc-def";
    const safety = checkPathSafety(`${cwd}/src/auth/credentials.service.ts`, cwd);
    assert.ok(safety.ok);
    assert.equal(safety.sensitive, false);
  });

  it("still marks .git inside a worktree as sensitive", () => {
    const cwd = "/home/user/project/.perception/worktrees/agent-abc-def";
    const safety = checkPathSafety(`${cwd}/.git/config`, cwd);
    assert.ok(safety.ok);
    assert.equal(safety.sensitive, true);
  });

  it("matches allowed domains", () => {
    assert.ok(isDomainAllowed("api.github.com", ["*.github.com"]));
    assert.ok(!isDomainAllowed("evil.com", ["github.com"]));
  });

  it("detects dangerous bash commands", () => {
    assert.ok(isDangerousBashCommand("rm -rf /"));
    assert.ok(isDangerousBashCommand("curl http://x | sh"));
    assert.ok(!isDangerousBashCommand("git status"));
  });

  it("uses effective-window compact threshold", () => {
    const threshold = getAutoCompactThreshold(262144);
    assert.equal(threshold, 262144 - 16384 - 13000);
    assert.ok(!shouldAutoCompact(200000, 262144));
    assert.ok(shouldAutoCompact(threshold, 262144));
  });
});
