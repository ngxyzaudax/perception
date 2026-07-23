import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { reconnectMcpServer } from "../services/mcp/mcpManager.js";
import { mcpHealthSummary } from "../services/mcp/mcpStatus.js";

describe("mcp resilience", () => {
  it("reports unknown servers on reconnect", async () => {
    const message = await reconnectMcpServer("missing-server");
    assert.match(message, /Unknown MCP server/);
  });

  it("summarizes healthy servers", () => {
    assert.equal(
      mcpHealthSummary([
        { serverName: "a", toolCount: 2, resourceCount: 0 },
        { serverName: "b", toolCount: 1, resourceCount: 1 },
      ]),
      "mcp 2",
    );
  });

  it("summarizes failing servers", () => {
    assert.equal(
      mcpHealthSummary([
        { serverName: "a", toolCount: 2, resourceCount: 0 },
        { serverName: "b", toolCount: 0, resourceCount: 0, error: "down" },
      ]),
      "mcp 1/2",
    );
  });

  it("returns null with no servers configured", () => {
    assert.equal(mcpHealthSummary([]), null);
  });
});
