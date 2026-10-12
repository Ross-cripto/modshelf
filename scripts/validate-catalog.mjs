import { readFile, realpath } from "node:fs/promises";
import { relative, resolve, isAbsolute, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { validateCatalog, isValidCatalogDate } from "../lib/catalog.ts";
import { artworkUrl } from "../lib/artwork.ts";

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const WEBP_MINIMUM_BYTES = 12;

export function parseCatalogArguments(argumentsList, requiresDraft, defaultProjectRoot = process.cwd()) {
  let projectRoot = defaultProjectRoot;
  let draftPath = null;
  let help = false;
  for (let argumentIndex = 0; argumentIndex < argumentsList.length; argumentIndex += 1) {
    const argument = argumentsList[argumentIndex];
    if (argument === "--help") {
      help = true;
      continue;
    }
    if (argument === "--project-root") {
      const rootArgument = argumentsList[argumentIndex + 1];
      if (!rootArgument || rootArgument.startsWith("--")) {
        throw new Error("--project-root requires a project path.");
      }
      projectRoot = resolve(defaultProjectRoot, rootArgument);
      argumentIndex += 1;
      continue;
    }
    if (argument.startsWith("--")) {
      throw new Error(`Unknown option: ${argument}.`);
    }
    if (!requiresDraft || draftPath !== null) {
      throw new Error(`Unexpected argument: ${argument}.`);
    }
    draftPath = argument;
  }
  if (requiresDraft && draftPath === null && !help) {
    throw new Error("Provide the path to one draft JSON file.");
  }
  return { projectRoot: resolve(projectRoot), draftPath, help };
}

export async function readJsonDocument(pathname, label) {
  let contents;
  try {
    contents = await readFile(pathname, "utf8");
  } catch (error) {
    throw new Error(`${label} could not be read at ${pathname}: ${error.message}`);
  }
  try {
    return JSON.parse(contents);
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`);
  }
}

export async function readCatalogFromProject(projectRoot) {
  const catalogPath = resolve(projectRoot, "catalog/mods.json");
  const input = await readJsonDocument(catalogPath, "Catalog");
  const result = validateCatalog(input);
  if (!result.success) throw new Error(result.error);
  return result.data;
}

function isWithinDirectory(directory, pathname) {
  const relativePath = relative(directory, pathname);
  if (isAbsolute(relativePath)) return false;
  if (relativePath === ".." || relativePath.startsWith(`..${sep}`)) return false;
  return relativePath.length > 0;
}

async function readLocalArtworkFile(artDirectory, pathname, label) {
  let resolvedPath;
  try {
    resolvedPath = await realpath(pathname);
  } catch {
    throw new Error(`${label} is missing: ${pathname}. Generate the illustration and provenance before adding the mod.`);
  }
  if (!isWithinDirectory(artDirectory, resolvedPath)) {
    throw new Error(`${label} must remain inside public/art: ${pathname}.`);
  }
  try {
    return await readFile(resolvedPath);
  } catch (error) {
    throw new Error(`${label} could not be read: ${error.message}`);
  }
}

function isSupportedImage(bytes, pathname) {
  if (pathname.endsWith(".png")) {
    return bytes.length >= PNG_SIGNATURE.length && bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE);
  }
  if (pathname.endsWith(".webp")) {
    if (bytes.length < WEBP_MINIMUM_BYTES) return false;
    return bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  }
  return false;
}

function validateProvenance(bytes, pathname) {
  let provenance;
  try {
    provenance = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error(`Illustration provenance must be valid JSON: ${pathname}.`);
  }
  if (!provenance || typeof provenance !== "object" || Array.isArray(provenance)) {
    throw new Error(`Illustration provenance must be an object: ${pathname}.`);
  }
  if (typeof provenance.prompt !== "string" || provenance.prompt.trim().length === 0) {
    throw new Error(`Illustration provenance requires its generation prompt: ${pathname}.`);
  }
  if (typeof provenance.createdAt !== "string" || !isValidCatalogDate(provenance.createdAt)) {
    throw new Error(`Illustration provenance requires a valid UTC createdAt timestamp: ${pathname}.`);
  }
}

export async function validateCatalogArtwork(mods, projectRoot) {
  const canonicalProjectRoot = await realpath(projectRoot);
  const artDirectory = resolve(canonicalProjectRoot, "public/art");
  const checkedIllustrations = new Set();
  for (const mod of mods) {
    const illustrationUrl = artworkUrl(mod.illustration);
    if (checkedIllustrations.has(illustrationUrl)) continue;
    const illustrationPath = resolve(canonicalProjectRoot, "public", illustrationUrl.slice(1));
    const image = await readLocalArtworkFile(artDirectory, illustrationPath, `Illustration for ${mod.id}`);
    if (!isSupportedImage(image, illustrationPath)) {
      throw new Error(`Illustration for ${mod.id} must be a PNG or WebP image: ${illustrationPath}.`);
    }
    const provenancePath = `${illustrationPath}.json`;
    const provenance = await readLocalArtworkFile(artDirectory, provenancePath, `Illustration provenance for ${mod.id}`);
    validateProvenance(provenance, provenancePath);
    checkedIllustrations.add(illustrationUrl);
  }
}

export function isMainModule(moduleUrl) {
  if (!process.argv[1]) return false;
  return fileURLToPath(moduleUrl) === resolve(process.argv[1]);
}

export function reportCatalogError(error) {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error("Catalog validation failed.");
  }
  process.exitCode = 1;
}

async function runValidation() {
  const options = parseCatalogArguments(process.argv.slice(2), false);
  if (options.help) {
    console.log("Usage: node --experimental-strip-types scripts/validate-catalog.mjs [--project-root <path>]");
    return;
  }
  const mods = await readCatalogFromProject(options.projectRoot);
  await validateCatalogArtwork(mods, options.projectRoot);
  console.log(`Validated ${mods.length} mods and their local illustrations.`);
}

if (isMainModule(import.meta.url)) {
  try {
    await runValidation();
  } catch (error) {
    reportCatalogError(error);
  }
}
