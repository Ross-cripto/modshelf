import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateModArtwork } from "../scripts/generate-mod-artwork.mjs";

function imagePayload() {
  const bytes = Buffer.alloc(33);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(bytes);
  bytes.write("IHDR", 12);
  bytes.writeUInt32BE(1536, 16);
  bytes.writeUInt32BE(1024, 20);
  return bytes.toString("base64");
}
async function createFixture() {
  const projectRoot = await mkdtemp(join(tmpdir(), "modshelf-art-"));
  await mkdir(join(projectRoot, "catalog"));
  await mkdir(join(projectRoot, "public/art"), { recursive: true });
  await mkdir(join(projectRoot, ".claude/skills/mod-artwork/references"), { recursive: true });
  await writeFile(join(projectRoot, "catalog/mods.json"), JSON.stringify([{ id: "test-mod", name: "Test Mod", description: "A terminal dashboard", illustration: "dashboard-art" }]));
  await writeFile(join(projectRoot, ".claude/skills/mod-artwork/references/style.md"), "A standalone illustration. Mod: [verified name]. Purpose: [verified description]. Object metaphor: [specific concept].");
  for (const name of ["arcade-art", "dashboard-art", "workflow-art"]) {
    await writeFile(join(projectRoot, `public/art/${name}.webp`), "reference");
  }
  return projectRoot;
}

test("generation sends shared references, saves PNG and exact provenance without changing metadata", async () => {
  const projectRoot = await createFixture();
  const originalCatalog = await readFile(join(projectRoot, "catalog/mods.json"), "utf8");
  let requestCount = 0;
  const fetchMock = async (url, options) => {
    requestCount += 1;
    assert.equal(url, "https://api.openai.com/v1/images/edits");
    assert.equal(options.body.getAll("image[]").length, 3);
    assert.equal(options.body.get("background"), "transparent");
    assert.match(options.body.get("prompt"), /Test Mod/);
    return { ok: true, json: async () => ({ data: [{ b64_json: imagePayload() }] }) };
  };
  try {
    const result = await generateModArtwork({ projectRoot, target: "test-mod", apiKey: "fixture-key", fetchImpl: fetchMock });
    assert.equal(requestCount, 1);
    assert.equal(result.illustration, "/art/test-mod.png");
    const provenance = JSON.parse(await readFile(join(projectRoot, "public/art/test-mod.png.json"), "utf8"));
    assert.match(provenance.prompt, /Test Mod/);
    assert.ok(Number.isFinite(Date.parse(provenance.createdAt)));
    assert.equal(await readFile(join(projectRoot, "catalog/mods.json"), "utf8"), originalCatalog);
  } finally { await rm(projectRoot, { recursive: true, force: true }); }
});

test("missing key, unsafe id, overwrite, and failed service leave no new asset", async () => {
  const projectRoot = await createFixture();
  const neverFetch = () => { throw new Error("Unexpected service call"); };
  try {
    await assert.rejects(generateModArtwork({ projectRoot, target: "test-mod", fetchImpl: neverFetch }), /OPENAI_API_KEY/);
    const draftPath = join(projectRoot, "draft.json");
    await writeFile(draftPath, JSON.stringify({ id: "../escape", name: "Escape", description: "Bad path" }));
    await assert.rejects(generateModArtwork({ projectRoot, target: draftPath, apiKey: "test", fetchImpl: neverFetch }), /safe mod id/);
    await writeFile(join(projectRoot, "public/art/test-mod.png"), "existing");
    await assert.rejects(generateModArtwork({ projectRoot, target: "test-mod", apiKey: "test", fetchImpl: neverFetch }), /--replace/);
    const failedFetch = async () => ({ ok: false, status: 429 });
    await assert.rejects(generateModArtwork({ projectRoot, target: "test-mod", replace: true, apiKey: "test", fetchImpl: failedFetch }), /429/);
    assert.equal(await readFile(join(projectRoot, "public/art/test-mod.png"), "utf8"), "existing");
  } finally { await rm(projectRoot, { recursive: true, force: true }); }
});

test("invalid image response is rejected before writing", async () => {
  const projectRoot = await createFixture();
  try {
    const invalidFetch = async () => ({ ok: true, json: async () => ({ data: [{ b64_json: Buffer.from("not an image").toString("base64") }] }) });
    await assert.rejects(generateModArtwork({ projectRoot, target: "test-mod", apiKey: "test", fetchImpl: invalidFetch }), /PNG/);
    await assert.rejects(readFile(join(projectRoot, "public/art/test-mod.png")), { code: "ENOENT" });
  } finally { await rm(projectRoot, { recursive: true, force: true }); }
});


test("requested replacement refuses symlink outputs", async () => {
  const projectRoot = await createFixture();
  try {
    const outsideTarget = join(projectRoot, "outside.txt");
    await writeFile(outsideTarget, "preserve me");
    await symlink(outsideTarget, join(projectRoot, "public/art/test-mod.png"));
    await assert.rejects(generateModArtwork({ projectRoot, target: "test-mod", replace: true, apiKey: "test", fetchImpl: () => { throw new Error("Unexpected request"); } }), /symbolic link/);
    assert.equal(await readFile(outsideTarget, "utf8"), "preserve me");
  } finally { await rm(projectRoot, { recursive: true, force: true }); }
});
