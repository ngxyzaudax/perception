import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hookEventSchema } from "../services/hooks/hookSchema.js";
import { parseHookStdout, runHookEvent } from "../services/hooks/runHooks.js";

describe("hooks protocol", () => {
  it("accepts the new hook events", () => {
    for (const event of ["PreCompact", "PostCompact", "SubagentStop", "Notification"]) {
      assert.equal(hookEventSchema.parse(event), event);
    }
  });

  it("parses block decisions from json stdout", () => {
    const result = parseHookStdout('{"decision":"block","reason":"not allowed"}');
    assert.deepEqual(result, { allowed: false, reason: "not allowed" });
  });

  it("parses additional context from json stdout", () => {
    const result = parseHookStdout('{"additionalContext":"remember the build step"}');
    assert.deepEqual(result, { allowed: true, context: "remember the build step" });
  });

  it("ignores non-json stdout", () => {
    assert.equal(parseHookStdout("plain text output"), null);
  });

  it("blocks tool use via json protocol hook", async () => {
    const result = await runHookEvent(
      {
        PreToolUse: [
          {
            hooks: [
              {
                type: "command",
                command: `echo '{"decision":"block","reason":"json-blocked"}'`,
              },
            ],
          },
        ],
      },
      { event: "PreToolUse", toolName: "Bash", summary: "ls", cwd: process.cwd() },
    );
    assert.deepEqual(result, { allowed: false, reason: "json-blocked" });
  });

  it("returns post-tool context via json protocol hook", async () => {
    const result = await runHookEvent(
      {
        PostToolUse: [
          {
            hooks: [
              {
                type: "command",
                command: `echo '{"additionalContext":"lint passed"}'`,
              },
            ],
          },
        ],
      },
      { event: "PostToolUse", toolName: "Bash", summary: "ls", output: "ok", cwd: process.cwd() },
    );
    assert.deepEqual(result, { allowed: true, context: "lint passed" });
  });

  it("fires subagent stop hooks with message payload", async () => {
    const result = await runHookEvent(
      {
        SubagentStop: [
          {
            hooks: [{ type: "command", command: "cat | grep -q agent-42" }],
          },
        ],
      },
      { event: "SubagentStop", summary: "agent-42", message: "done", cwd: process.cwd() },
    );
    assert.equal(result.allowed, true);
  });
});
