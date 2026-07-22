import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { buildMcpToolName } from "../services/mcp/mcpTools.js";
import {
  closeMcpConnections,
  connectMcpTools,
  formatMcpStatus,
} from "../services/mcp/mcpManager.js";
import { projectMcpConfigPath } from "../services/mcp/mcpConfig.js";
import { formatMcpResources } from "../services/mcp/mcpResources.js";
import { createToolRegistry } from "../tools.js";
import { getTool } from "../Tool.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const echoServerPath = join(root, "src/test/fixtures/mcpEchoServer.ts");

describe("mcp", () => {
  it("formats resource listings", () => {
    const formatted = formatMcpResources([
      { serverName: "echo", uri: "file:///tmp/demo", name: "demo" },
    ]);
    assert.match(formatted, /echo/);
  });

  it("connects echo server and invokes wrapped tool", async () => {
    const configPath = projectMcpConfigPath();
    await mkdir(dirname(configPath), { recursive: true });
    await writeFile(
      configPath,
      `${JSON.stringify(
        {
          mcpServers: {
            echo: {
              command: "npx",
              args: ["tsx", echoServerPath],
            },
          },
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const { tools, statuses } = await connectMcpTools();
    assert.equal(statuses.length, 1);
    assert.match(formatMcpStatus(statuses), /echo/);

    const toolName = buildMcpToolName("echo", "echo");
    const echoTool = tools.find((tool) => tool.name === toolName);
    assert.ok(echoTool);

    const registry = createToolRegistry(tools);
    const wrapped = getTool(registry, toolName);
    assert.ok(wrapped);
    const output = await wrapped!.call(
      { message: "mcp-echo-ok" },
      { cwd: root, abortSignal: new AbortController().signal },
    );
    assert.match(output, /mcp-echo-ok/);
    await closeMcpConnections();
    await rm(configPath, { force: true });
  });
});
