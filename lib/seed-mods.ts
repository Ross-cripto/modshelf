import catalogEntries from "../catalog/mods.json" with { type: "json" };
import { validateCatalog } from "./catalog.ts";
import type { Mod } from "./catalog.ts";

const catalogResult = validateCatalog(catalogEntries);
if (!catalogResult.success) {
  throw new Error(`Invalid Modshelf catalog: ${catalogResult.error}`);
}

export const SEED_MODS: Mod[] = catalogResult.data;
