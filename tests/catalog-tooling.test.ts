import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, copyFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const projectRoot = resolve(import.meta.dirname, "..");
const draft = {
  id: "new-arcade",
  name: "New Arcade",
  description: "A small terminal game using Claude Code function hooks.",
  author: "Ada",
  category: "Games",
  repository: "https://github.com/ada/new-arcade",
  install: "claude plugin install new-arcade",
  tags: ["terminal", "game"],
  illustration: "/art/new-arcade.webp",
  createdAt: "2026-10-12T00:00:00Z",
  featured: false,
  license: "MIT",
  modType: "claude-code-mod",
  functionHookEvidence: "https://github.com/ada/new-arcade/blob/HEAD/hooks.ts",
};

async function createProjectFixture() {
  const fixtureRoot = await mkdtemp(resolve(tmpdir(), "modshelf-catalog-"));
  await mkdir(resolve(fixtureRoot, "catalog"));
  await mkdir(resolve(fixtureRoot, "public/art"), { recursive: true });
  await writeFile(resolve(fixtureRoot, "catalog/mods.json"), "[]\n");
  await writeFile(resolve(fixtureRoot, "draft.json"), JSON.stringify(draft));
  await copyFile(resolve(projectRoot, "public/art/arcade-art.webp"), resolve(fixtureRoot, "public/art/new-arcade.webp"));
  await writeFile(resolve(fixtureRoot, "public/art/new-arcade.webp.json"), JSON.stringify({ prompt: "Original ink illustration of a new arcade cabinet.", createdAt: "2026-10-12T00:00:00Z" }));
  return fixtureRoot;
}

function runCatalogCommand(script: string, fixtureRoot: string, argumentsList: string[] = []) {
  return spawnSync(process.execPath, ["--experimental-strip-types", resolve(projectRoot, "scripts", script), ...argumentsList, "--project-root", fixtureRoot], { cwd: fixtureRoot, encoding: "utf8" });
}

test("add-mod appends a validated draft and the complete registry then validates", async () => {
  const fixtureRoot = await createProjectFixture();
  try {
    const addition = runCatalogCommand("add-mod.mjs", fixtureRoot, ["draft.json"]);
    assert.equal(addition.status, 0, addition.stderr);
    const registry = JSON.parse(await readFile(resolve(fixtureRoot, "catalog/mods.json"), "utf8"));
    assert.deepEqual(registry, [draft]);
    const validation = runCatalogCommand("validate-catalog.mjs", fixtureRoot);
    assert.equal(validation.status, 0, validation.stderr);
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("add-mod refuses duplicates without changing the registry", async () => {
  const fixtureRoot = await createProjectFixture();
  try {
    await writeFile(resolve(fixtureRoot, "catalog/mods.json"), JSON.stringify([draft]));
    const before = await readFile(resolve(fixtureRoot, "catalog/mods.json"), "utf8");
    const result = runCatalogCommand("add-mod.mjs", fixtureRoot, ["draft.json"]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /duplicate/i);
    assert.equal(await readFile(resolve(fixtureRoot, "catalog/mods.json"), "utf8"), before);
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("add-mod refuses unavailable generated art without changing the registry", async () => {
  const fixtureRoot = await createProjectFixture();
  try {
    await rm(resolve(fixtureRoot, "public/art/new-arcade.webp"));
    const result = runCatalogCommand("add-mod.mjs", fixtureRoot, ["draft.json"]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /illustration.*missing/i);
    assert.equal(await readFile(resolve(fixtureRoot, "catalog/mods.json"), "utf8"), "[]\n");
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("catalog validation refuses illustrations without valid generation provenance", async () => {
  const fixtureRoot = await createProjectFixture();
  try {
    await writeFile(resolve(fixtureRoot, "catalog/mods.json"), JSON.stringify([draft]));
    await writeFile(resolve(fixtureRoot, "public/art/new-arcade.webp.json"), JSON.stringify({ prompt: "", createdAt: "invalid" }));
    const result = runCatalogCommand("validate-catalog.mjs", fixtureRoot);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /provenance/i);
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("catalog validation refuses placeholder files disguised as illustrations", async () => {
  const fixtureRoot = await createProjectFixture();
  try {
    await writeFile(resolve(fixtureRoot, "catalog/mods.json"), JSON.stringify([draft]));
    await writeFile(resolve(fixtureRoot, "public/art/new-arcade.webp"), "Image generation unavailable.");
    const result = runCatalogCommand("validate-catalog.mjs", fixtureRoot);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /image/i);
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("add-mod rejects a generic skill draft without mutating the registry", async () => {
  const fixtureRoot = await createProjectFixture();
  try {
    await writeFile(resolve(fixtureRoot, "draft.json"), JSON.stringify({ ...draft, modType: "skill" }));
    const result = runCatalogCommand("add-mod.mjs", fixtureRoot, ["draft.json"]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Claude Code mod/i);
    assert.equal(await readFile(resolve(fixtureRoot, "catalog/mods.json"), "utf8"), "[]\n");
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("CLI options report missing values and never write a registry", async () => {
  const fixtureRoot = await createProjectFixture();
  try {
    const result = spawnSync(process.execPath, ["--experimental-strip-types", resolve(projectRoot, "scripts/add-mod.mjs"), "draft.json", "--project-root"], { cwd: fixtureRoot, encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /project-root.*path/i);
    assert.equal(await readFile(resolve(fixtureRoot, "catalog/mods.json"), "utf8"), "[]\n");
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});
