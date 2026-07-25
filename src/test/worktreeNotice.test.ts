import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyWorktreeNotice,
  buildWorktreeNotice,
} from "../services/agents/worktreeNotice.js";

describe("worktree notice", () => {
  it("directs isolated agents to use only their worktree", () => {
    const notice = buildWorktreeNotice({
      worktreePath: "/repo/.perception/worktrees/agent-1",
      branch: "agent/agent-1",
    });
    assert.match(notice, /isolated git worktree/);
    assert.match(notice, /Use paths relative/);
    assert.match(notice, /parent repository.*rejected/);
    assert.match(notice, /agent\/agent-1/);
  });

  it("prepends the notice only for isolated contexts", () => {
    const prompt = "Read src/main.ts";
    const isolated = applyWorktreeNotice(prompt, {
      cwd: "/repo/.perception/worktrees/agent-1",
      branch: "agent/agent-1",
      isolated: true,
    });
    const shared = applyWorktreeNotice(prompt, {
      cwd: "/repo",
      isolated: false,
    });
    assert.ok(isolated.endsWith(prompt));
    assert.match(isolated, /worktrees\/agent-1/);
    assert.equal(shared, prompt);
  });
});
