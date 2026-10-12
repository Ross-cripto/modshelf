import { readFile, writeFile, access, realpath, lstat } from "node:fs/promises";
import { resolve, relative, isAbsolute, sep } from "node:path";
import { fileURLToPath } from "node:url";

const IMAGE_MODEL = "gpt-image-2.5-sunburst";
const IMAGE_WIDTH = 1536;
const IMAGE_HEIGHT = 1024;
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const REFERENCE_NAMES = ["arcade-art", "dashboard-art", "workflow-art"];

async function fileExists(pathname) {
  try { await access(pathname); return true; }
  catch (error) { if (error.code === "ENOENT") return false; throw error; }
}

async function rejectSymlink(pathname) {
  try {
    const fileInformation = await lstat(pathname);
    if (fileInformation.isSymbolicLink()) throw new Error("Artwork output cannot be a symbolic link.");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

async function resolveEntry(projectRoot, target) {
  if (target.endsWith(".json")) {
    return JSON.parse(await readFile(resolve(projectRoot, target), "utf8"));
  }
  const catalog = JSON.parse(await readFile(resolve(projectRoot, "catalog/mods.json"), "utf8"));
  const entry = catalog.find((mod) => mod.id === target);
  if (!entry) throw new Error(`No catalog mod matches ${target}. Provide its id or a draft JSON file.`);
  return entry;
}

function validateArtworkEntry(entry) {
  if (!entry || typeof entry.id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.id)) {
    throw new Error("Artwork requires a safe mod id containing lowercase words separated by hyphens.");
  }
  if (typeof entry.name !== "string" || typeof entry.description !== "string") {
    throw new Error("Artwork requires the mod's verified name and description.");
  }
}

function buildArtworkPrompt(recipe, entry, concept) {
  const quotedRecipe = recipe.split("\n").find((line) => line.startsWith("> "));
  const basePrompt = quotedRecipe ? quotedRecipe.slice(2) : recipe.trim();
  return basePrompt.replace("[verified name]", entry.name)
    .replace("[verified description]", entry.description)
    .replace("[specific concept]", concept || `A small collection of desk objects evoking ${entry.description}`);
}

function decodeImageResponse(response) {
  const encodedImage = response?.data?.[0]?.b64_json;
  if (typeof encodedImage !== "string") throw new Error("The image service did not return an image.");
  const bytes = Buffer.from(encodedImage, "base64");
  if (bytes.length < 33 || !bytes.subarray(0, 8).equals(PNG_SIGNATURE) || bytes.toString("ascii", 12, 16) !== "IHDR") {
    throw new Error("The image service returned an invalid PNG.");
  }
  if (bytes.readUInt32BE(16) !== IMAGE_WIDTH || bytes.readUInt32BE(20) !== IMAGE_HEIGHT) {
    throw new Error(`The PNG must be ${IMAGE_WIDTH} by ${IMAGE_HEIGHT} pixels.`);
  }
  return bytes;
}

export async function generateModArtwork({ projectRoot = process.cwd(), target, replace = false, concept, apiKey = process.env.OPENAI_API_KEY, fetchImpl = fetch }) {
  if (!apiKey) throw new Error("Set OPENAI_API_KEY locally to use the optional image helper, or use a connected image-generation tool.");
  const canonicalRoot = await realpath(projectRoot);
  const entry = await resolveEntry(canonicalRoot, target);
  validateArtworkEntry(entry);
  const artDirectory = await realpath(resolve(canonicalRoot, "public/art"));
  const relativeDirectory = relative(canonicalRoot, artDirectory);
  if (isAbsolute(relativeDirectory) || relativeDirectory === ".." || relativeDirectory.startsWith(`..${sep}`)) {
    throw new Error("The artwork directory must remain inside the repository.");
  }
  const imagePath = resolve(artDirectory, `${entry.id}.png`);
  const provenancePath = `${imagePath}.json`;
  await rejectSymlink(imagePath);
  await rejectSymlink(provenancePath);
  if (!replace && (await fileExists(imagePath) || await fileExists(provenancePath))) {
    throw new Error("Artwork already exists. Use --replace only when regeneration was requested.");
  }
  const recipe = await readFile(resolve(canonicalRoot, ".claude/skills/mod-artwork/references/style.md"), "utf8");
  const prompt = buildArtworkPrompt(recipe, entry, concept);
  const requestBody = new FormData();
  requestBody.set("model", IMAGE_MODEL);
  requestBody.set("prompt", prompt);
  requestBody.set("size", `${IMAGE_WIDTH}x${IMAGE_HEIGHT}`);
  requestBody.set("quality", "medium");
  requestBody.set("background", "transparent");
  requestBody.set("output_format", "png");
  for (const referenceName of REFERENCE_NAMES) {
    const referencePath = resolve(artDirectory, `${referenceName}.webp`);
    const referenceBytes = await readFile(referencePath);
    requestBody.append("image[]", new Blob([referenceBytes], { type: "image/webp" }), `${referenceName}.webp`);
  }
  let serviceResponse;
  try {
    serviceResponse = await fetchImpl("https://api.openai.com/v1/images/edits", {
      method: "POST", headers: { Authorization: `Bearer ${apiKey}` }, body: requestBody,
    });
  } catch { throw new Error("The image-generation service could not be reached. No artwork was written."); }
  if (!serviceResponse.ok) throw new Error(`Image generation failed with HTTP ${serviceResponse.status}. No artwork was written.`);
  const imageBytes = decodeImageResponse(await serviceResponse.json());
  const provenance = { prompt, createdAt: new Date().toISOString(), model: IMAGE_MODEL, references: REFERENCE_NAMES.map((name) => `/art/${name}.webp`) };
  await writeFile(imagePath, imageBytes, { flag: replace ? "w" : "wx" });
  await writeFile(provenancePath, `${JSON.stringify(provenance, null, 2)}\n`, { flag: replace ? "w" : "wx" });
  return { illustration: `/art/${entry.id}.png`, imagePath, provenancePath };
}

function parseArguments(argumentsList) {
  let target;
  let replace = false;
  let concept;
  for (let argumentIndex = 0; argumentIndex < argumentsList.length; argumentIndex += 1) {
    const argument = argumentsList[argumentIndex];
    if (argument === "--help") return { help: true };
    if (argument === "--replace") { replace = true; continue; }
    if (argument === "--concept") {
      concept = argumentsList[argumentIndex + 1];
      if (!concept || concept.startsWith("--")) throw new Error("--concept requires an object metaphor.");
      argumentIndex += 1;
      continue;
    }
    if (argument.startsWith("--") || target) throw new Error(`Unexpected argument: ${argument}.`);
    target = argument;
  }
  if (!target) throw new Error("Provide a mod id or draft JSON path.");
  return { target, replace, concept };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    const options = parseArguments(process.argv.slice(2));
    if (options.help) {
      console.log("Usage: node scripts/generate-mod-artwork.mjs <id|draft.json> [--replace] [--concept <object metaphor>]");
    } else {
      const result = await generateModArtwork(options);
      console.log(`Generated ${result.illustration} and its prompt sidecar. Review the image before updating the catalog.`);
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
