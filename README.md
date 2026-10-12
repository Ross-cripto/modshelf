# Modshelf

[![Validate](https://github.com/Ross-cripto/modshelf/actions/workflows/validate.yml/badge.svg)](https://github.com/Ross-cripto/modshelf/actions/workflows/validate.yml) [![MIT license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

An open-source marketplace exclusively for Claude Code function-hook mods. Built with Next.js and TypeScript, with a shared family of hand-drawn ink illustrations.

## Run locally

Use Node.js 22.13 or later.

```bash
npm ci
npm run dev
```

Open http://localhost:3000. Search, categories, sorting, browser-local saved mods, and installation details work without accounts or a database.

## Try a mod

Every listing includes **Try this mod**, opening its own [prompt-driven terminal demo](https://modshelf.vercel.app/mods/cc-arcade/demo). Type any message, watch a scripted Claude turn, use the mod while it works, and send another prompt after the reply. All 24 catalog mods have source-grounded adapters: command-opened panes, breathing, games, usage reports, queues, guards, transcript rendering, attachments, file trees and independent progress or music clocks.

These are **local simulations**, not connected Claude sessions. Messages stay in the browser. Files, agents, account usage, PRs, playback and replies are explicitly labeled fixtures; no AI service, shell execution or credentials are needed. cc-arcade includes a real playable 2048 board, with its MIT attribution preserved. See [docs/mod-demos.md](docs/mod-demos.md) for the behavior matrix and extension guide. Shared session state lives in `lib/mod-simulation.ts`, terminal composition in `lib/demo-terminal-frame.ts`, adapters in `lib/demo-views/`, and the browser interface in `components/mod-terminal-demo.tsx`.

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

Merging into main updates the Vercel site when your GitHub integration is connected. Forks can be imported into a separate Vercel project.

## Source download

Production builds refresh `public/modshelf-source.zip`, available from the website footer. It includes the project, catalog, contribution skills, and artwork. It excludes secrets, dependencies, build output, and the archive itself.

```bash
npm run source:zip
```

## Content and artwork

Catalog entries link to the original creator and verified function-hook source. Listing dates are catalog dates, not repository release dates. Repository review does not replace runtime testing. See [ATTRIBUTION.md](ATTRIBUTION.md) for sources and [catalog/discovery.md](catalog/discovery.md) for the discovery process.

The generated illustrations share an ink and muted-color style. Inter and Newsreader use the SIL Open Font License; their licenses are included in `public/fonts/licenses/`. Website code is licensed under MIT. Independent community project, not affiliated with Anthropic.

## Community and support

Use the [issue templates](https://github.com/Ross-cripto/modshelf/issues/new/choose) for website bugs and mod suggestions. Contributions are reviewed through pull requests; see [CONTRIBUTING.md](CONTRIBUTING.md). Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).
