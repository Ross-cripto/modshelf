# Modshelf

An open-source marketplace exclusively for Claude Code function-hook mods. Built with Next.js and TypeScript, with a shared family of hand-drawn ink illustrations.

## Run locally

Use Node.js 22.13 or later.

```bash
npm ci
npm run dev
```

Open http://localhost:3000. Search, categories, sorting, browser-local saved mods, and installation details work without accounts or a database.

## Contribute through the repository

Open this project in Claude Code and use the included skills:

```text
/add-mod https://github.com/you/your-mod --pr
/mod-artwork cc-arcade --pr
```

The first skill verifies the mod, prepares a listing and consistent artwork, and opens a pull request when requested. The second creates or refreshes artwork. Omit `--pr` to prepare local changes first. Read [CONTRIBUTING.md](CONTRIBUTING.md) for image generation setup and review requirements.

Listings live in `catalog/mods.json`. Images and exact generation prompts live together in `public/art/`. Contributions are reviewed before merging; connecting this GitHub repository to Vercel makes merges rebuild the catalog.

## Deploy to Vercel

Import [Ross-cripto/modshelf](https://github.com/Ross-cripto/modshelf) into Vercel. Keep the Next.js framework preset and the included `vercel.json`, which selects `npm run build:vercel`. No database or runtime environment variables are required. Image-generation credentials are optional contributor tooling and belong only on the contributor's computer.

```bash
npm run catalog:validate
npm test
npm run build
```

Vercel deployment requires connecting the repository to your own Vercel account. This project does not include a Vercel deployment made on your behalf.

## Source download

Production builds refresh `public/modshelf-source.zip`, available from the website footer. It includes the project, catalog, contribution skills, and artwork. It excludes secrets, dependencies, build output, and the archive itself.

```bash
npm run source:zip
```

## Content and artwork

The six initial listings link to real community repositories. Original summaries and source installation instructions were verified on October 12, 2026. Listing dates are catalog dates, not repository release dates. Creators maintain their own projects; see [ATTRIBUTION.md](ATTRIBUTION.md).

The generated illustrations share an ink and muted-color style. Inter and Newsreader use the SIL Open Font License; their licenses are included in `public/fonts/licenses/`. Website code is licensed under MIT. Independent community project, not affiliated with Anthropic.
