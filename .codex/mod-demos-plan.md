# Plan: prompt-driven previews for every mod

## Summary
Every current catalog card links to its own terminal demo. The visitor sends arbitrary text; a local, scripted Claude session moves through thinking, tool use, reply, and completion. Each mod responds to its actual source-defined events and accepts relevant interactions.

## Scope
All 24 current listings, shared terminal session runtime, distinct source-grounded mod views, playable 2048 and dinosaur runner, prompt queue, gates, panes, transcript and attachment examples, catalog/detail links, contributor documentation, and production publication. These are explicitly labeled simulations with fixture usage, files, music and external services. Messages stay in the browser. No AI API or remote mod execution.

## Mandatory reading
- AGENTS.md and the installed Next.js dynamic routes guide.
- catalog/mods.json, components/marketplace.tsx and lib/mod-demos.ts.
- Existing xterm input/render helpers and 2048 rules.
- Pinned register/render sources for every mod; source metadata travels with each definition.

## Tasks
1. Verify each mod's native placement, activation command, lifecycle and interactions from source.
2. Test then implement catalog coverage and pure session lifecycle: idle, working, waiting for gate, completion, cancellation, queue, restart, and input sanitization.
3. Implement distinct views and actions using source-defined placements and triggers. Keep shared transcript and mod output separately modeled.
4. Build one statically generated route per mod with a working prompt, clear simulation status, terminal mouse/keyboard controls, phone equivalents and source/installation context.
5. Verify all routes and all profiles, exercise interactive families, inspect desktop/phone/current viewport together, perform bounded Impeccable finish review and record shipped design.
6. Run catalog validation, tests and build, publish through a checked PR, verify public routes and source archive.

## Acceptance criteria
- Every published catalog entry has a working Try this mod link on its card and details.
- Arbitrary prompts start visible local work and a reply; repeat prompts and reset work.
- Idle/busy/tool/turn-complete behavior follows each mod's source; command-only panes remain command driven.
- Mod-specific actions work, including gameplay, queueing, gate decisions, attachment removal, tabs and navigation.
- All displayed external account/project data is explicitly simulated. No message leaves the browser.
- No prompt can inject terminal control sequences, markup or executable commands.
- Keyboard focus can leave the terminal, phone controls remain reachable, no horizontal page overflow.
- All 24 demos ship together; unknown IDs return 404.

## Validation commands
`npm run catalog:validate`, `npm test`, `npm run build`, browser interactions against built routes, CI and public-site verification.

## Notes
Skills: feature-plan, Impeccable, Emil design engineering, TDD, frontend accessibility, Vercel React best practices, verification before completion. Preserve the approved Community Shelf surround and scoped native terminal system. User authorized complete implementation and publication; no new approval gate.

Codex effort: high
