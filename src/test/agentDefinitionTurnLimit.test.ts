import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { getAgentByName, loadAgents } from "../services/agents/loadAgents.js";

describe("agent definition turn limits", () => {
  it("loads maxTurns from agent frontmatter", async () => {
    const root = await mkdtemp(join(tmpdir(), "perception-agent-turns-"));
    const previousHome = process.env.PERCEPTION_HOME;
    try {
      await mkdir(join(root, "agents"), { recursive: true });
      await writeFile(
        join(root, "agents", "limited.md"),
        "---\nname: limited\nmaxTurns: 7\n---\nWork within the limit",
        "utf8",
      );
      process.env.PERCEPTION_HOME = root;
      const agent = getAgentByName(await loadAgents(), "limited");
      assert.equal(agent?.maxTurns, 7);
    } finally {
      if (previousHome === undefined) {
        delete process.env.PERCEPTION_HOME;
      } else {
        process.env.PERCEPTION_HOME = previousHome;
      }
      await rm(root, { recursive: true, force: true });
    }
  });
});
