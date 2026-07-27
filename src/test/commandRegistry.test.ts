import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterCommandCompletions,
  findCommand,
  listCommandCompletions,
  listCommands,
  registerSkillCommands,
} from "../commands/registry.js";
import { formatHelp } from "../screens/helpText.js";
import { filterToolRegistry } from "../Tool.js";
import { createToolRegistry } from "../tools.js";
import { parseSkillFile } from "../skills/skillSchema.js";

describe("command registry", () => {
  it("lists built-in commands", () => {
    const names = listCommands().map((command) => command.name);
    for (const expected of ["/exit", "/clear", "/compact", "/mcp", "/permissions", "/commit"]) {
      assert.ok(names.includes(expected), `missing ${expected}`);
    }
  });

  it("finds commands by first token", () => {
    assert.equal(findCommand("/config set model foo")?.name, "/config");
    assert.equal(findCommand("/permissions plan")?.name, "/permissions");
    assert.equal(findCommand("/unknown"), undefined);
  });

  it("merges registered skills into completions", () => {
    const skill = parseSkillFile(
      "deploy",
      "/tmp/skills/deploy",
      "---\nname: deploy\ndescription: Deploy the app\n---\nDeploy now",
    );
    registerSkillCommands([skill]);
    const completions = filterCommandCompletions("/de");
    assert.ok(completions.some((completion) => completion.name === "/deploy"));
    registerSkillCommands([]);
  });

  it("excludes non-invocable skills from completions", () => {
    const skill = parseSkillFile(
      "hidden",
      "/tmp/skills/hidden",
      "---\nname: hidden\nuser-invocable: false\n---\nBody",
    );
    registerSkillCommands([skill]);
    assert.ok(
      !filterCommandCompletions("/hi").some((completion) => completion.name === "/hidden"),
    );
    registerSkillCommands([]);
  });

  it("formats help from the same sorted completions as autocomplete", () => {
    const completions = listCommandCompletions();
    const help = formatHelp(completions);
    const names = completions.map((completion) => completion.name);
    assert.deepEqual(names, [...names].sort((left, right) => left.localeCompare(right)));
    for (const completion of completions) {
      assert.ok(help.includes(`- ${completion.name} - ${completion.description}`));
    }
  });
});

describe("skill frontmatter", () => {
  it("parses allowed-tools, model, and agent fields", () => {
    const skill = parseSkillFile(
      "commit",
      "/tmp/skills/commit",
      "---\nname: commit\nallowed-tools: Bash, Read\nmodel: qwen-small\nagent: true\n---\nBody",
    );
    assert.deepEqual(skill.allowedTools, ["Bash", "Read"]);
    assert.equal(skill.model, "qwen-small");
    assert.equal(skill.runAsAgent, true);
  });

  it("defaults skill overrides when absent", () => {
    const skill = parseSkillFile("plain", "/tmp/skills/plain", "---\nname: plain\n---\nBody");
    assert.deepEqual(skill.allowedTools, []);
    assert.equal(skill.model, undefined);
    assert.equal(skill.runAsAgent, false);
  });

  it("restricts the tool registry to allowed tools", () => {
    const registry = createToolRegistry();
    const filtered = filterToolRegistry(registry, ["Bash", "Read"]);
    assert.deepEqual(Object.keys(filtered).sort(), ["Bash", "Read"]);
    assert.equal(filterToolRegistry(registry, []), registry);
  });
});
