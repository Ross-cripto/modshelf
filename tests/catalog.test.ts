import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import * as catalog from "../lib/catalog.ts";
import { artworkUrl } from "../lib/artwork.ts";

const mod = {
  id: "test-arcade",
  name: "Arcade",
  description: "Play while Claude works",
  author: "Ada",
  category: "Games",
  repository: "https://github.com/ada/arcade",
  install: "claude plugin install arcade\nOpen Claude Code.",
  tags: ["terminal"],
  illustration: "arcade-art",
  createdAt: "2026-10-12T00:00:00Z",
  featured: true,
  license: "MIT",
  modType: "claude-code-mod",
  functionHookEvidence: "https://github.com/ada/arcade/blob/HEAD/README.md",
};

function validateEntry(input: unknown) {
  assert.equal(typeof catalog.validateCatalogEntry, "function");
  return catalog.validateCatalogEntry(input);
}

function validateRegistry(input: unknown) {
  assert.equal(typeof catalog.validateCatalog, "function");
  return catalog.validateCatalog(input);
}

test("search and category filters work together", () => {
  const result = validateEntry(mod);
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(catalog.filterMods([result.data], "ada", "Games", "featured", []).length, 1);
  assert.equal(catalog.filterMods([result.data], "ada", "Workflow", "featured", []).length, 0);
});

test("saved filter shows only saved mods", () => {
  const result = validateEntry(mod);
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(catalog.filterMods([result.data], "", "Saved", "featured", []).length, 0);
  assert.equal(catalog.filterMods([result.data], "", "Saved", "featured", ["test-arcade"]).length, 1);
});

test("sorting preserves the original catalog and supports featured, name and newest", () => {
  const result = validateRegistry([
    mod,
    { ...mod, id: "alpha", name: "Alpha", repository: "https://github.com/ada/alpha", functionHookEvidence: "https://github.com/ada/alpha/blob/HEAD/hooks.ts", featured: false, createdAt: "2026-10-13T00:00:00Z" },
  ]);
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(catalog.filterMods(result.data, "", "All mods", "name", [])[0].name, "Alpha");
  assert.equal(catalog.filterMods(result.data, "", "All mods", "newest", [])[0].name, "Alpha");
  assert.equal(catalog.filterMods(result.data, "", "All mods", "featured", [])[0].name, "Arcade");
  assert.equal(result.data[0].name, "Arcade");
});

test("valid catalog entries preserve multiline installation instructions", () => {
  const result = validateEntry(mod);
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.install, "claude plugin install arcade\nOpen Claude Code.");
});

test("generic skills and prompt packs cannot enter the mod catalog", () => {
  assert.equal(validateEntry({ ...mod, modType: "skill" }).success, false);
  assert.equal(validateEntry({ ...mod, modType: "prompt-pack" }).success, false);
  assert.equal(validateEntry({ ...mod, functionHookEvidence: "" }).success, false);
});

test("entries reject unknown upload fields and missing explicit defaults", () => {
  assert.equal(validateEntry({ ...mod, archiveKey: "upload.zip" }).success, false);
  assert.equal(validateEntry({ ...mod, submitted: true }).success, false);
  assert.equal(validateEntry({ ...mod, featured: undefined }).success, false);
  assert.equal(validateEntry({ ...mod, createdAt: undefined }).success, false);
  assert.equal(validateEntry(null).success, false);
});

test("repository URLs reject unsafe hosts, credentials, queries and traversal", () => {
  const invalidRepositories = [
    "javascript:alert(1)",
    "http://github.com/ada/arcade",
    "https://github.com.evil.test/ada/arcade",
    "https://user:password@github.com/ada/arcade",
    "https://github.com/ada/arcade?download=true",
    "https://github.com/ada/arcade#readme",
    "https://github.com/ada/arcade/tree/main/../secret",
    "https://github.com/ada/arcade/tree/main/%2e%2e/secret",
  ];
  for (const repository of invalidRepositories) {
    assert.equal(validateEntry({ ...mod, repository }).success, false, repository);
  }
});

test("function hook evidence must point to a README or source file in the listing repository", () => {
  const invalidEvidence = [
    "https://github.com/other/arcade/blob/main/README.md",
    "https://github.com/ada/different/blob/main/hooks.py",
    "http://github.com/ada/arcade/blob/main/README.md",
    "https://github.com/ada/arcade/tree/main/hooks",
    "https://github.com/ada/arcade/blob/main/screenshot.png",
    "https://github.com/ada/arcade/blob/main/hooks.ts?raw=1",
  ];
  for (const functionHookEvidence of invalidEvidence) {
    assert.equal(validateEntry({ ...mod, functionHookEvidence }).success, false, functionHookEvidence);
  }
  assert.equal(validateEntry({ ...mod, repository: "https://github.com/ada/arcade/tree/main/plugins/arcade", functionHookEvidence: "https://github.com/ada/arcade/blob/main/plugins/arcade/hooks.py" }).success, true);
});

test("ids, categories and impossible dates are rejected", () => {
  assert.equal(validateEntry({ ...mod, id: "../arcade" }).success, false);
  assert.equal(validateEntry({ ...mod, id: "Arcade Mod" }).success, false);
  assert.equal(validateEntry({ ...mod, category: "Prompts" }).success, false);
  assert.equal(validateEntry({ ...mod, createdAt: "2026-02-30T00:00:00Z" }).success, false);
  assert.equal(validateEntry({ ...mod, createdAt: "yesterday" }).success, false);
});

test("installation instructions, license and nonempty tags are required", () => {
  assert.equal(validateEntry({ ...mod, install: "" }).success, false);
  assert.equal(validateEntry({ ...mod, license: "" }).success, false);
  assert.equal(validateEntry({ ...mod, tags: [] }).success, false);
  assert.equal(validateEntry({ ...mod, tags: [" "] }).success, false);
  assert.equal(validateEntry({ ...mod, tags: ["terminal", "Terminal"] }).success, false);
});

test("catalog validation rejects duplicate ids and duplicate repository listings", () => {
  const duplicateId = { ...mod, repository: "https://github.com/ada/second", functionHookEvidence: "https://github.com/ada/second/blob/main/README.md" };
  assert.equal(validateRegistry([mod, duplicateId]).success, false);
  assert.equal(validateRegistry([mod, { ...mod, id: "second", repository: "https://github.com/Ada/Arcade/" }]).success, false);
  assert.equal(validateRegistry({ entries: [mod] }).success, false);
});

test("custom illustrations resolve safely and invalid paths are rejected", () => {
  assert.equal(artworkUrl("/art/new-arcade.png"), "/art/new-arcade.png");
  assert.equal(artworkUrl("/art/new-arcade.webp"), "/art/new-arcade.webp");
  assert.equal(artworkUrl("arcade-art"), "/art/arcade-art.webp");
  assert.equal(artworkUrl("toString"), "/art/context-art.webp");
  const unsafeIllustrations = ["/art/../private.png", "/art/nested/new.png", "/art/new.svg", "/art/new.png?download=1", "https://example.com/new.png", "missing-art"];
  for (const illustration of unsafeIllustrations) {
    assert.equal(validateEntry({ ...mod, illustration }).success, false, illustration);
  }
});

test("seed listings are loaded from the version-controlled registry", async () => {
  const registryPath = new URL("../catalog/mods.json", import.meta.url);
  assert.equal(existsSync(registryPath), true);
  const registry = JSON.parse(await readFile(registryPath, "utf8"));
  const { SEED_MODS } = await import("../lib/seed-mods.ts");
  assert.deepEqual(SEED_MODS, registry);
});
