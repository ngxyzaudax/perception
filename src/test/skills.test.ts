import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { listCommandCompletions } from "../commands/registry.js";
import { parseConfigCommand } from "../screens/configCommand.js";
import { formatHelp } from "../screens/helpText.js";
import { formatContextReport } from "../screens/contextReport.js";
import { runDoctor } from "../services/doctor/runDoctor.js";
import {
  expandSkill,
  getSkillByName,
  matchSkillCommand,
} from "../skills/loadSkills.js";
import { parseSkillFile } from "../skills/skillSchema.js";
import { refreshSkills, SkillTool } from "../tools/SkillTool.js";
import { parseFrontmatter } from "../utils/frontmatter.js";
import { loadSettings } from "../utils/config.js";

describe("skills", () => {
  it("parses frontmatter", () => {
    const parsed = parseFrontmatter(`---
name: demo
description: Demo skill
---
Run with $ARGUMENTS`);
    assert.equal(parsed.frontmatter.name, "demo");
    assert.match(parsed.body, /\$ARGUMENTS/);
  });

  it("parses skill files and expands arguments", () => {
    const skill = parseSkillFile(
      "review",
      "/tmp/skills/review",
      `---
name: Code Review
description: Review changes
user-invocable: true
disable-model-invocation: false
---
Review $ARGUMENTS in ${"${PERCEPTION_SKILL_DIR}"}`,
    );
    assert.equal(skill.commandName, "review");
    assert.ok(skill.userInvocable);
    const expanded = expandSkill(skill, "src/main.ts");
    assert.match(expanded, /src\/main.ts/);
    assert.match(expanded, /\/tmp\/skills\/review/);
  });

  it("matches user-invocable skill commands", () => {
    const skill = parseSkillFile("lint", "/tmp/lint", "---\n---\nLint $ARGUMENTS");
    assert.ok(getSkillByName([skill], "lint"));
    const match = matchSkillCommand("/lint src/", [skill]);
    assert.equal(match?.args, "src/");
    const hidden = parseSkillFile("hidden", "/tmp/hidden", "---\nuser-invocable: false\n---\nHidden");
    assert.equal(matchSkillCommand("/hidden", [hidden]), null);
  });

  it("loads skills from disk and invokes Skill tool", async () => {
    const root = await mkdtemp(join(tmpdir(), "perception-skill-"));
    const skillDir = join(root, "skills", "demo");
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      join(skillDir, "SKILL.md"),
      "---\nname: Demo\n---\nEcho $ARGUMENTS",
      "utf8",
    );
    process.env.PERCEPTION_HOME = root;
    const skills = await refreshSkills();
    assert.ok(skills.some((entry) => entry.commandName === "demo"));
    const output = await SkillTool.call(
      { skill: "demo", args: "hello" },
      { cwd: process.cwd(), abortSignal: new AbortController().signal },
    );
    assert.match(output, /hello/);
    delete process.env.PERCEPTION_HOME;
    await rm(root, { recursive: true, force: true });
  });
});

describe("screens", () => {
  it("lists help and config commands", async () => {
    const settings = await loadSettings();
    const help = formatHelp(listCommandCompletions());
    assert.match(help, /\/doctor - /);
    assert.match(help, /\/auto-run - /);
    const show = parseConfigCommand("/config", settings);
    assert.equal(show.type, "show");
    const invalid = parseConfigCommand("/config unknown value", settings);
    assert.equal(invalid.type, "invalid");
  });

  it("formats context report", () => {
    const context = formatContextReport(3, 120);
    assert.match(context, /messages: 3/);
    const help = formatHelp(listCommandCompletions());
    assert.match(help, /\/tasks - /);
  });

  it("runs doctor checks", async () => {
    const settings = await loadSettings();
    const report = await runDoctor(settings);
    assert.match(report, /vLLM:/);
    assert.match(report, /ripgrep:/);
    assert.match(report, /skills:/);
  });
});
