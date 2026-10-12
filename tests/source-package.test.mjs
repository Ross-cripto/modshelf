import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm, copyFile, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { unzipSync } from "fflate";

const SOURCE_DIRECTORIES = ["app", "components", "lib", "public", "scripts", "tests", "catalog", ".claude", ".github"];

test("source download includes contributions and leaves local credentials out", async () => {
  const fixtureRoot = await mkdtemp(join(tmpdir(), "modshelf-source-"));
  try {
    for (const directory of SOURCE_DIRECTORIES) await mkdir(join(fixtureRoot, directory), { recursive: true });
    await mkdir(join(fixtureRoot, ".claude/skills/example"), { recursive: true });
    await writeFile(join(fixtureRoot, "catalog/mods.json"), "[]");
    await writeFile(join(fixtureRoot, ".claude/skills/example/SKILL.md"), "public contribution guide");
    await writeFile(join(fixtureRoot, "app/.env.local"), "LOCAL_SECRET=fixture-sentinel");
    await writeFile(join(fixtureRoot, ".claude/settings.local.json"), '{"local":"fixture-sentinel"}');
    await writeFile(join(fixtureRoot, ".claude/settings.json"), '{"shared":true}');
    await writeFile(join(fixtureRoot, ".env.example"), "OLD_AI_TEMPLATE=");
    await copyFile(new URL("../scripts/package-source.mjs", import.meta.url), join(fixtureRoot, "scripts/package-source.mjs"));
    await symlink(new URL("../node_modules", import.meta.url).pathname, join(fixtureRoot, "node_modules"), "dir");
    execFileSync(process.execPath, ["scripts/package-source.mjs"], { cwd: fixtureRoot });
    const archive = unzipSync(new Uint8Array(await readFile(join(fixtureRoot, "public/modshelf-source.zip"))));
    assert.ok(archive["modshelf/catalog/mods.json"]);
    assert.ok(archive["modshelf/.claude/skills/example/SKILL.md"]);
    assert.ok(archive["modshelf/.claude/settings.json"]);
    assert.equal(archive["modshelf/app/.env.local"], undefined);
    assert.equal(archive["modshelf/.claude/settings.local.json"], undefined);
    assert.equal(archive["modshelf/.env.example"], undefined);
    assert.equal(archive["modshelf/public/modshelf-source.zip"], undefined);
    for (const bytes of Object.values(archive)) assert.equal(Buffer.from(bytes).includes(Buffer.from("fixture-sentinel")), false);
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});
