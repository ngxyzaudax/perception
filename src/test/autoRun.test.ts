import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  autoRunStatusText,
  isAutoRunOn,
  nextAutoRunMode,
  parseAutoRunArg,
  resolveAutoRunMode,
  applyAutoRunToggle,
} from "../screens/autoRunToggle.js";
import { grantAllPermissions } from "../screens/permissionResolver.js";
import { filterCommandCompletions, findCommand, listCommands } from "../commands/registry.js";
import type { Settings } from "../schemas/settings.js";

describe("auto-run toggle helpers", () => {
  it("detects auto-run from permission mode", () => {
    assert.equal(isAutoRunOn("bypassPermissions"), true);
    assert.equal(isAutoRunOn("default"), false);
    assert.equal(isAutoRunOn("plan"), false);
  });

  it("round-trips default through bypassPermissions", () => {
    const on = nextAutoRunMode("default");
    assert.equal(on, "bypassPermissions");
    assert.equal(nextAutoRunMode(on), "default");
  });

  it("enables auto-run from plan mode and returns to default", () => {
    assert.equal(nextAutoRunMode("plan"), "bypassPermissions");
    assert.equal(nextAutoRunMode("bypassPermissions"), "default");
  });

  it("parses command arguments", () => {
    assert.equal(parseAutoRunArg("/auto-run on"), "on");
    assert.equal(parseAutoRunArg("/auto-run off"), "off");
    assert.equal(parseAutoRunArg("/auto-run status"), "status");
    assert.equal(parseAutoRunArg("/auto-run"), null);
    assert.equal(parseAutoRunArg("/auto-run bogus"), null);
  });

  it("resolves explicit and toggle modes", () => {
    assert.equal(resolveAutoRunMode("on", "default"), "bypassPermissions");
    assert.equal(resolveAutoRunMode("off", "bypassPermissions"), "default");
    assert.equal(resolveAutoRunMode(null, "default"), "bypassPermissions");
    assert.equal(resolveAutoRunMode(null, "bypassPermissions"), "default");
  });

  it("formats status text by resulting mode", () => {
    assert.equal(
      autoRunStatusText("bypassPermissions"),
      "auto-run enabled: permission prompts skipped",
    );
    assert.equal(autoRunStatusText("default"), "auto-run disabled: mode default");
  });

  it("grants pending permissions when enabling auto-run", () => {
    const settings = { permissionMode: "default" } as Settings;
    let enabledCalls = 0;
    let liveSettings = settings;
    applyAutoRunToggle({
      permissionMode: "default",
      liveSettings,
      updatePermissionMode: () => undefined,
      setLiveSettings: (next) => {
        liveSettings = next;
      },
      appendStatusLine: () => undefined,
      persistSettings: () => undefined,
      onEnabled: () => {
        enabledCalls += 1;
      },
    });
    assert.equal(enabledCalls, 1);
    assert.equal(liveSettings.permissionMode, "bypassPermissions");
  });

  it("does not grant pending permissions when disabling auto-run", () => {
    let enabledCalls = 0;
    applyAutoRunToggle({
      permissionMode: "bypassPermissions",
      liveSettings: { permissionMode: "bypassPermissions" } as Settings,
      updatePermissionMode: () => undefined,
      setLiveSettings: () => undefined,
      appendStatusLine: () => undefined,
      persistSettings: () => undefined,
      onEnabled: () => {
        enabledCalls += 1;
      },
    });
    assert.equal(enabledCalls, 0);
  });
});

describe("grant pending permissions", () => {
  it("resolves all queued permission prompts as granted", () => {
    const results: boolean[] = [];
    grantAllPermissions([
      {
        toolName: "Bash",
        summary: "echo a",
        resolve: (result) => results.push(result.granted),
      },
      {
        toolName: "Bash",
        summary: "echo b",
        resolve: (result) => results.push(result.granted),
      },
    ]);
    assert.deepEqual(results, [true, true]);
  });
});

describe("auto-run command registration", () => {
  it("lists /auto-run among built-in commands", () => {
    const names = listCommands().map((command) => command.name);
    assert.ok(names.includes("/auto-run"));
  });

  it("finds /auto-run by first token", () => {
    assert.equal(findCommand("/auto-run on")?.name, "/auto-run");
  });

  it("includes /auto-run in completions", () => {
    assert.ok(
      filterCommandCompletions("/auto").some((completion) => completion.name === "/auto-run"),
    );
  });
});
