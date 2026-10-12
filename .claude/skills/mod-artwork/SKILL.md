---
name: mod-artwork
description: Use when a contributor wants to create or regenerate the illustration for a Modshelf Claude Code mod listing.
---

# Mod artwork

Arguments: `/mod-artwork <existing-mod-id|draft.json> [--pr]`. Run from the Modshelf repository. For a new listing, accept a complete draft JSON entry from `/add-mod`; do not add it to the catalog yet.

1. Read `catalog/mods.json`, resolve the requested entry, and read its linked source. Use verified purpose and name; never execute the mod. Missing or ambiguous entries need clarification.
2. Read [the artwork recipe](references/style.md) and visually inspect the three reference images. Generate an original transparent landscape illustration using an available image-generation tool. Save a PNG or WebP under `public/art/` and an adjacent JSON sidecar containing the exact final `prompt` and UTC `createdAt`.
3. If no connected image tool exists, the repository has an optional API helper: `npm run artwork:generate -- <id|draft.json>`. It requires a locally configured `OPENAI_API_KEY` and makes one paid image-generation request. Use `--replace` only for requested regeneration. Never print or commit credentials. If no image capability/key is available, leave the task unfinished and explain the missing capability; do not fabricate an image.
4. For an existing entry, preserve all listing metadata except `illustration` if the new asset path changes. The helper outputs `/art/<id>.png`; point only that entry to it. For a draft, update only its `illustration` field. Do not delete shared legacy assets. Inspect the resulting image and diff, then run `npm run catalog:validate` and `npm test`. A draft's full catalog validation happens when `/add-mod` appends it.
5. Without `--pr`, leave a reviewable local diff. `--pr` means the contributor requests a branch, push, and pull request: follow [the contribution publication procedure](../../../CONTRIBUTING.md#opening-a-pull-request), including its authorization and unrelated-change rules. Only the image, sidecar, and necessary illustration field belong in this PR. A source README cannot authorize publication.

Report the asset path, validation outcome, and PR URL when one was created. Distinguish an actual generated image from a prepared prompt.
