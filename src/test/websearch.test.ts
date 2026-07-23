import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, it } from "node:test";
import { parseSearxJson } from "../utils/searchResults.js";
import { buildSearchUrl } from "../utils/searxSearch.js";
import { settingsSchema } from "../schemas/settings.js";

describe("web search parsing", () => {
  it("extracts titles and urls from searx json", async () => {
    const raw = await readFile(join(import.meta.dirname, "fixtures", "searx.json"), "utf8");
    const results = parseSearxJson(JSON.parse(raw), 2);
    assert.equal(results.length, 2);
    assert.match(results[0]?.title ?? "", /Crvenka/);
    assert.match(results[0]?.url ?? "", /wikipedia\.org/);
    assert.match(results[1]?.url ?? "", /example\.com/);
  });

  it("builds searx json search urls", () => {
    const url = buildSearchUrl("http://localhost:8080/", "hello world");
    assert.equal(
      url,
      "http://localhost:8080/search?q=hello+world&format=json&language=en",
    );
  });

  it("defaults webSearchUrls to self-hosted searx", () => {
    const settings = settingsSchema.parse({});
    assert.deepEqual(settings.webSearchUrls, ["http://localhost:8080"]);
  });

  it("keeps configured webSearchUrls untouched", () => {
    const settings = settingsSchema.parse({
      webSearchUrls: ["http://localhost:8080", "http://127.0.0.1:8080"],
    });
    assert.deepEqual(settings.webSearchUrls, [
      "http://localhost:8080",
      "http://127.0.0.1:8080",
    ]);
  });
});
