import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { buildSystemPrompt } from "../context/systemPrompt.js";
import { exportConversation } from "../services/export/exportConversation.js";
import { projectMemoryPath } from "../services/sessions/sessionPaths.js";
import {
  createSession,
  listSessions,
  loadSession,
  saveSession,
} from "../services/sessions/sessionStore.js";
import { appendInputHistory, loadInputHistory } from "../state/inputHistory.js";
import type { ChatMessage } from "../types/messages.js";
import { getCwd } from "../utils/cwd.js";

const sampleMessages: ChatMessage[] = [
  { role: "user", content: "hello session test" },
  { role: "assistant", content: "session stored" },
];

describe("sessions", () => {
  it("round-trips session storage", async () => {
    const session = createSession(getCwd());
    session.messages = sampleMessages;
    await saveSession(session);
    const listed = await listSessions(getCwd());
    assert.ok(listed.some((entry) => entry.id === session.id));
    const loaded = await loadSession(session.id, getCwd());
    assert.ok(loaded);
    assert.deepEqual(loaded?.messages, sampleMessages);
    assert.match(loaded?.title ?? "", /hello session test/);
  });

  it("injects project memory into system prompt", async () => {
    const memoryDir = join(getCwd(), ".perception");
    const memoryPath = projectMemoryPath();
    await mkdir(memoryDir, { recursive: true });
    await writeFile(memoryPath, "Prefer functional style.\n", "utf8");
    const prompt = await buildSystemPrompt();
    assert.match(prompt, /Project memory/);
    assert.match(prompt, /Prefer functional style/);
    await rm(memoryPath, { force: true });
  });

  it("persists input history", async () => {
    const root = await mkdtemp(join(tmpdir(), "perception-history-"));
    process.env.PERCEPTION_HOME = root;
    await appendInputHistory("first prompt");
    const history = await loadInputHistory();
    assert.ok(history.includes("first prompt"));
    delete process.env.PERCEPTION_HOME;
    await rm(root, { recursive: true, force: true });
  });

  it("exports conversation to markdown", async () => {
    const root = await mkdtemp(join(tmpdir(), "perception-export-"));
    const originalCwd = process.cwd();
    process.chdir(root);
    try {
      const path = await exportConversation("session-1", [
        { role: "user", content: "hello" },
        { role: "assistant", content: "hi" },
      ]);
      const content = await readFile(path, "utf8");
      assert.match(content, /you:/);
      assert.match(content, /assistant:/);
    } finally {
      process.chdir(originalCwd);
      await rm(root, { recursive: true, force: true });
    }
  });
});
