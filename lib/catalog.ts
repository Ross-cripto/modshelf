import { isArtworkReference } from "./artwork.ts";

export const MOD_LIMITS = {
  idMaximum: 80,
  nameMinimum: 2,
  nameMaximum: 60,
  descriptionMinimum: 15,
  descriptionMaximum: 240,
  installMinimum: 5,
  installMaximum: 4000,
  licenseMinimum: 2,
  licenseMaximum: 100,
  tagMinimum: 1,
  tagMaximum: 40,
  tagsMaximum: 12,
} as const;
export const CATEGORIES = [
  "Games",
  "Dashboards",
  "Workflow",
  "While you wait",
  "Safety & privacy",
  "Interface",
  "Memory & context",
] as const;
export type ModCategory = (typeof CATEGORIES)[number];
export type Mod = {
  id: string;
  name: string;
  description: string;
  author: string;
  category: ModCategory;
  repository: string;
  install: string;
  tags: string[];
  illustration: string;
  createdAt: string;
  featured: boolean;
  license: string;
  modType: "claude-code-mod";
  functionHookEvidence: string;
};
export type ValidationResult<Value> =
  | { success: true; data: Value }
  | { success: false; error: string };

const CATALOG_FIELDS = new Set([
  "id",
  "name",
  "description",
  "author",
  "category",
  "repository",
  "install",
  "tags",
  "illustration",
  "createdAt",
  "featured",
  "license",
  "modType",
  "functionHookEvidence",
]);
const GITHUB_URL_PREFIX = "https://github.com/";
const SAFE_PATH_SEGMENT_PATTERN = /^[a-zA-Z0-9_.-]+$/;
const MOD_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UTC_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const README_PATTERN = /^readme(?:\.(?:md|mdx|rst|txt))?$/i;
const SOURCE_FILE_PATTERN = /\.(?:ts|tsx|js|jsx|mjs|cjs|py|go|rs|sh|json|yaml|yml|toml|md|mdx|rb|lua|swift|java|kt|c|cpp|h|ps1)$/i;

function matchesSearch(mod: Mod, query: string): boolean {
  const searchableText = [
    mod.name,
    mod.description,
    mod.author,
    mod.category,
    ...mod.tags,
  ]
    .join(" ")
    .toLowerCase();
  return searchableText.includes(query.trim().toLowerCase());
}

function matchesCategory(mod: Mod, category: string, savedIds: string[]): boolean {
  if (category === "All mods") return true;
  if (category === "Saved") return savedIds.includes(mod.id);
  return mod.category === category;
}

export function filterMods(
  mods: Mod[],
  query: string,
  category: string,
  sort: string,
  savedIds: string[],
): Mod[] {
  const filtered = mods.filter(
    (mod) => matchesSearch(mod, query) && matchesCategory(mod, category, savedIds),
  );
  if (sort === "name") {
    return filtered.sort((first, second) => first.name.localeCompare(second.name));
  }
  if (sort === "newest") {
    return filtered.sort((first, second) => second.createdAt.localeCompare(first.createdAt));
  }
  return filtered.sort((first, second) => Number(second.featured) - Number(first.featured));
}

function isRecord(input: unknown): input is Record<string, unknown> {
  if (input === null || typeof input !== "object") return false;
  return !Array.isArray(input);
}

function readText(input: Record<string, unknown>, key: string): string {
  const value = input[key];
  if (typeof value !== "string") return "";
  return value.trim();
}

function isModCategory(category: string): category is ModCategory {
  return CATEGORIES.some((item) => item === category);
}

function isWithinLength(value: string, minimum: number, maximum: number): boolean {
  return value.length >= minimum && value.length <= maximum;
}

function isSafePathSegment(segment: string): boolean {
  if (segment === "." || segment === "..") return false;
  return SAFE_PATH_SEGMENT_PATTERN.test(segment);
}

function parseGitHubPath(value: string): string[] | null {
  if (!value.startsWith(GITHUB_URL_PREFIX)) return null;
  let pathname = value.slice(GITHUB_URL_PREFIX.length);
  if (pathname.endsWith("/")) pathname = pathname.slice(0, -1);
  const pathSegments = pathname.split("/");
  if (pathSegments.length < 2) return null;
  for (const segment of pathSegments) {
    if (!isSafePathSegment(segment)) return null;
  }
  return pathSegments;
}

export function isGitHubRepository(value: string): boolean {
  const pathSegments = parseGitHubPath(value);
  if (!pathSegments) return false;
  if (pathSegments.length === 2) return true;
  return pathSegments[2] === "tree" && pathSegments.length >= 4;
}

function hasMatchingRepository(firstPath: string[], secondPath: string[]): boolean {
  return firstPath[0].toLowerCase() === secondPath[0].toLowerCase()
    && firstPath[1].toLowerCase() === secondPath[1].toLowerCase();
}

export function isFunctionHookEvidence(value: string, repository: string): boolean {
  const evidencePath = parseGitHubPath(value);
  const repositoryPath = parseGitHubPath(repository);
  if (!evidencePath || !repositoryPath) return false;
  if (evidencePath.length < 5 || evidencePath[2] !== "blob") return false;
  if (!hasMatchingRepository(evidencePath, repositoryPath)) return false;
  const filename = evidencePath[evidencePath.length - 1];
  return README_PATTERN.test(filename) || SOURCE_FILE_PATTERN.test(filename);
}

export function isValidCatalogDate(value: string): boolean {
  if (!UTC_DATE_PATTERN.test(value)) return false;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return false;
  let normalizedDate = value;
  if (!value.includes(".")) normalizedDate = value.replace("Z", ".000Z");
  return date.toISOString() === normalizedDate;
}

function validateTags(input: unknown): ValidationResult<string[]> {
  if (!Array.isArray(input) || input.length === 0) {
    return { success: false, error: "Add at least one nonempty tag." };
  }
  if (input.length > MOD_LIMITS.tagsMaximum) {
    return { success: false, error: `Use at most ${MOD_LIMITS.tagsMaximum} tags.` };
  }
  const tags: string[] = [];
  const normalizedTags = new Set<string>();
  for (const value of input) {
    if (typeof value !== "string") {
      return { success: false, error: "Tags must be text." };
    }
    const tag = value.trim();
    if (!isWithinLength(tag, MOD_LIMITS.tagMinimum, MOD_LIMITS.tagMaximum)) {
      return { success: false, error: `Tags must contain ${MOD_LIMITS.tagMinimum}–${MOD_LIMITS.tagMaximum} characters.` };
    }
    const normalizedTag = tag.toLowerCase();
    if (normalizedTags.has(normalizedTag)) {
      return { success: false, error: "Remove duplicate tags." };
    }
    normalizedTags.add(normalizedTag);
    tags.push(tag);
  }
  return { success: true, data: tags };
}

export function validateCatalogEntry(input: unknown): ValidationResult<Mod> {
  if (!isRecord(input)) {
    return { success: false, error: "A catalog entry must be a JSON object." };
  }
  for (const field of Object.keys(input)) {
    if (!CATALOG_FIELDS.has(field)) {
      return { success: false, error: `Unknown catalog field: ${field}.` };
    }
  }
  const id = readText(input, "id");
  const name = readText(input, "name");
  const description = readText(input, "description");
  const author = readText(input, "author");
  const category = readText(input, "category");
  const repository = readText(input, "repository");
  const install = readText(input, "install");
  const illustration = readText(input, "illustration");
  const createdAt = readText(input, "createdAt");
  const license = readText(input, "license");
  const functionHookEvidence = readText(input, "functionHookEvidence");
  if (!MOD_ID_PATTERN.test(id) || id.length > MOD_LIMITS.idMaximum) {
    return { success: false, error: `Use an explicit lowercase hyphenated mod id, up to ${MOD_LIMITS.idMaximum} characters.` };
  }
  if (!isWithinLength(name, MOD_LIMITS.nameMinimum, MOD_LIMITS.nameMaximum)) {
    return { success: false, error: `Use a mod name between ${MOD_LIMITS.nameMinimum} and ${MOD_LIMITS.nameMaximum} characters.` };
  }
  if (!isWithinLength(description, MOD_LIMITS.descriptionMinimum, MOD_LIMITS.descriptionMaximum)) {
    return { success: false, error: `Describe your mod in ${MOD_LIMITS.descriptionMinimum}–${MOD_LIMITS.descriptionMaximum} characters.` };
  }
  if (!isWithinLength(author, MOD_LIMITS.nameMinimum, MOD_LIMITS.nameMaximum)) {
    return { success: false, error: "Add your creator name or GitHub handle." };
  }
  if (!isModCategory(category)) {
    return { success: false, error: "Choose a supported mod category." };
  }
  if (!isGitHubRepository(repository)) {
    return { success: false, error: "Use an HTTPS link to a GitHub repository or its tree directory." };
  }
  if (input.modType !== "claude-code-mod") {
    return { success: false, error: 'Identify the entry as a Claude Code mod with modType: "claude-code-mod". Generic skills and prompt packs are not mods.' };
  }
  if (!isFunctionHookEvidence(functionHookEvidence, repository)) {
    return { success: false, error: "Add an HTTPS GitHub README or source-file link demonstrating function hooks in this repository." };
  }
  if (!isWithinLength(install, MOD_LIMITS.installMinimum, MOD_LIMITS.installMaximum)) {
    return { success: false, error: `Add installation instructions, up to ${MOD_LIMITS.installMaximum.toLocaleString("en-US")} characters.` };
  }
  if (!isWithinLength(license, MOD_LIMITS.licenseMinimum, MOD_LIMITS.licenseMaximum)) {
    return { success: false, error: `State the mod's open-source license, up to ${MOD_LIMITS.licenseMaximum} characters.` };
  }
  const tagsResult = validateTags(input.tags);
  if (!tagsResult.success) return tagsResult;
  if (!isArtworkReference(illustration)) {
    return { success: false, error: "Use a known illustration key or a local /art/<slug>.png or .webp path." };
  }
  if (!isValidCatalogDate(createdAt)) {
    return { success: false, error: "Use a valid UTC ISO timestamp for createdAt." };
  }
  if (typeof input.featured !== "boolean") {
    return { success: false, error: "Set featured explicitly to true or false." };
  }
  return {
    success: true,
    data: {
      id,
      name,
      description,
      author,
      category,
      repository,
      install,
      tags: tagsResult.data,
      illustration,
      createdAt,
      featured: input.featured,
      license,
      modType: "claude-code-mod",
      functionHookEvidence,
    },
  };
}

function repositoryIdentity(repository: string): string {
  const pathSegments = parseGitHubPath(repository);
  if (!pathSegments) return repository;
  const [owner, name, ...directory] = pathSegments;
  return [owner.toLowerCase(), name.toLowerCase(), ...directory].join("/");
}

export function validateCatalog(input: unknown): ValidationResult<Mod[]> {
  if (!Array.isArray(input)) {
    return { success: false, error: "The catalog must be a JSON array." };
  }
  const mods: Mod[] = [];
  const ids = new Set<string>();
  const repositories = new Set<string>();
  for (const [entryIndex, inputEntry] of input.entries()) {
    const result = validateCatalogEntry(inputEntry);
    if (!result.success) {
      return { success: false, error: `Catalog entry ${entryIndex + 1}: ${result.error}` };
    }
    if (ids.has(result.data.id)) {
      return { success: false, error: `Duplicate mod id: ${result.data.id}.` };
    }
    const repositoryKey = repositoryIdentity(result.data.repository);
    if (repositories.has(repositoryKey)) {
      return { success: false, error: `Duplicate repository listing: ${result.data.repository}.` };
    }
    ids.add(result.data.id);
    repositories.add(repositoryKey);
    mods.push(result.data);
  }
  return { success: true, data: mods };
}
