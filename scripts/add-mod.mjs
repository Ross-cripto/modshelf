import { writeFile, rename, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { validateCatalogEntry, validateCatalog } from "../lib/catalog.ts";
import {
  parseCatalogArguments,
  readJsonDocument,
  readCatalogFromProject,
  validateCatalogArtwork,
  isMainModule,
  reportCatalogError,
} from "./validate-catalog.mjs";

async function writeCatalog(projectRoot, mods) {
  const catalogPath = resolve(projectRoot, "catalog/mods.json");
  const temporaryPath = `${catalogPath}.${process.pid}.tmp`;
  try {
    await writeFile(temporaryPath, `${JSON.stringify(mods, null, 2)}\n`, "utf8");
    await rename(temporaryPath, catalogPath);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}

async function addMod() {
  const options = parseCatalogArguments(process.argv.slice(2), true);
  if (options.help) {
    console.log("Usage: node --experimental-strip-types scripts/add-mod.mjs <draft.json> [--project-root <path>]");
    return;
  }
  const draftPath = resolve(options.projectRoot, options.draftPath);
  const input = await readJsonDocument(draftPath, "Mod draft");
  const entryResult = validateCatalogEntry(input);
  if (!entryResult.success) throw new Error(entryResult.error);
  const currentMods = await readCatalogFromProject(options.projectRoot);
  const catalogResult = validateCatalog([...currentMods, entryResult.data]);
  if (!catalogResult.success) throw new Error(catalogResult.error);
  await validateCatalogArtwork(catalogResult.data, options.projectRoot);
  await writeCatalog(options.projectRoot, catalogResult.data);
  console.log(`Added ${entryResult.data.id}. Review catalog/mods.json and the illustration files before opening a pull request.`);
}

if (isMainModule(import.meta.url)) {
  try {
    await addMod();
  } catch (error) {
    reportCatalogError(error);
  }
}
