import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { z } from "zod";
import { buildTool } from "../Tool.js";
import { createPermissionContext } from "../permissions/checkPermission.js";
import { executeToolCall } from "../query/executeToolCall.js";
import { settingsSchema } from "../schemas/settings.js";

const settings = settingsSchema.parse({});

describe("executeToolCall abort", () => {
  it("returns aborted tool message when signal is already aborted", async () => {
    const tool = buildTool({
      name: "Slow",
      description: "slow",
      inputSchema: z.object({ value: z.string() }),
      isReadOnly: () => true,
      summarize: (input) => input.value,
      call: async () => "should not run",
    });
    const controller = new AbortController();
    controller.abort("user-cancel");
    const message = await executeToolCall({
      call: { id: "1", name: "Slow", arguments: JSON.stringify({ value: "x" }) },
      registry: { Slow: tool },
      settings,
      permissionContext: createPermissionContext("bypassPermissions"),
      signal: controller.signal,
      onEvent: () => undefined,
    });
    assert.equal(message.role, "tool");
    assert.equal(message.content, "Tool call aborted before completion.");
    assert.equal(message.isError, true);
  });
});
