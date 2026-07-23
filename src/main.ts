#!/usr/bin/env bun
import { Command } from "@commander-js/extra-typings";
import { runPrintMode } from "./cli/print.js";
import type { Settings } from "./schemas/settings.js";
import { loadSettings } from "./utils/config.js";
import { installCrashHandlers } from "./utils/crashLog.js";

installCrashHandlers();

const program = new Command()
  .name("perception")
  .description("Local coding harness powered by vLLM")
  .option("--base-url <url>", "OpenAI-compatible API base URL")
  .option("--model <model>", "Model id")
  .option(
    "--permission-mode <mode>",
    "Permission mode: default, plan, bypassPermissions",
  )
  .option("-p, --print <prompt>", "Run a single prompt headlessly and print the result")
  .option(
    "--output-format <format>",
    "Print output format: text, json, stream-json",
  )
  .action(async (options) => {
    const settings = await loadSettings();
    const merged: Settings = {
      ...settings,
      baseUrl: options.baseUrl ?? settings.baseUrl,
      model: options.model ?? settings.model,
      permissionMode:
        (options.permissionMode as Settings["permissionMode"]) ??
        settings.permissionMode,
    };
    if (options.print) {
      const { parseOutputFormat } = await import("./cli/printOutput.js");
      process.exit(
        await runPrintMode(merged, options.print, parseOutputFormat(options.outputFormat)),
      );
    }
    const { launchRepl } = await import("./entrypoints/cli.js");
    await launchRepl(merged);
  });

program
  .command("mcp")
  .description("Run perception as an MCP server over stdio")
  .action(async () => {
    const { runMcpServer } = await import("./entrypoints/mcpServer.js");
    await runMcpServer();
  });

await program.parseAsync(process.argv);
