import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parsePositiveTurnLimit } from "../query/turnLimits.js";
import { AgentTool } from "../tools/AgentTool.js";

describe("agent turn limits", () => {
  it("parses positive maxTurns frontmatter values", () => {
    assert.equal(parsePositiveTurnLimit("12"), 12);
    assert.equal(parsePositiveTurnLimit("0"), undefined);
    assert.equal(parsePositiveTurnLimit("-1"), undefined);
    assert.equal(parsePositiveTurnLimit("1.5"), undefined);
    assert.equal(parsePositiveTurnLimit(undefined), undefined);
  });

  it("accepts positive Agent tool overrides", () => {
    const parsed = AgentTool.inputSchema.parse({
      description: "limited",
      prompt: "work",
      max_turns: 3,
    });
    assert.equal(parsed.max_turns, 3);
    assert.equal(
      AgentTool.inputSchema.safeParse({
        description: "invalid",
        prompt: "work",
        max_turns: 0,
      }).success,
      false,
    );
  });
});
