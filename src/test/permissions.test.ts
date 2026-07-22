import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createPermissionContext, checkToolPermission } from "../permissions/checkPermission.js";
import { matchesRule } from "../permissions/rules.js";
import { shouldAutoCompact } from "../services/compact/autoCompact.js";

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

  it("triggers auto-compact at threshold", () => {
    assert.ok(shouldAutoCompact(200000, 262144));
    assert.ok(!shouldAutoCompact(1000, 262144));
  });
});
