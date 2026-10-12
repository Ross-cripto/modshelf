# Catalog discovery

Discovery date: October 12, 2026.

A broad GitHub search discovered **263 distinct public repositories** using repository search for `claude mods` and the `claude-code-mod` and `claude-code-mods` topics. The [community index](https://github.com/karanb192/awesome-claude-code-mods) supplied additional discovery leads. Search results depend on GitHub indexing and query limits; this is not a complete census of GitHub.

This reviewed batch adds **18 installable mods** to the original six. Each new listing was checked against its marketplace manifest, actual function-hook module, and declared license. Source links below are pinned to the inspected commit. The mods were not installed or executed; source review does not certify runtime compatibility or safety.

Repositories with multiple plugins receive one listing per selected installable mod. Generic skills, prompt packs, MCP servers, and ordinary shell hooks are not admitted merely because they use the word “mod.”

The broader discovery snapshot is retained in [discovered-repositories.json](discovered-repositories.json) as leads for future contributions. Those search results are unreviewed and do not appear on the website. Use `/add-mod <repository URL>` for the same review and artwork workflow.

## Reviewed additions

| Mod | Creator | Function-hook source | License source |
| --- | --- | --- | --- |
| [quota-meter](https://github.com/Arunjay4213/claude-mods/tree/main/plugins/quota-meter) | Arunjay4213 | [Source](https://github.com/Arunjay4213/claude-mods/blob/d4fffd7de9204a62b10e7b3604fc893158fa25fd/plugins/quota-meter/hooks/register.tsx) | [MIT](https://github.com/Arunjay4213/claude-mods/blob/d4fffd7de9204a62b10e7b3604fc893158fa25fd/README.md#license) |
| [token-ledger](https://github.com/Arunjay4213/claude-mods/tree/main/plugins/token-ledger) | Arunjay4213 | [Source](https://github.com/Arunjay4213/claude-mods/blob/d4fffd7de9204a62b10e7b3604fc893158fa25fd/plugins/token-ledger/hooks/register.tsx) | [MIT](https://github.com/Arunjay4213/claude-mods/blob/d4fffd7de9204a62b10e7b3604fc893158fa25fd/README.md#license) |
| [budget-guard](https://github.com/Arunjay4213/claude-mods/tree/main/plugins/budget-guard) | Arunjay4213 | [Source](https://github.com/Arunjay4213/claude-mods/blob/d4fffd7de9204a62b10e7b3604fc893158fa25fd/plugins/budget-guard/hooks/register.tsx) | [MIT](https://github.com/Arunjay4213/claude-mods/blob/d4fffd7de9204a62b10e7b3604fc893158fa25fd/README.md#license) |
| [mermaid-draw](https://github.com/galElmalah/claude-mods/tree/main/claude-mermaid) | galElmalah | [Source](https://github.com/galElmalah/claude-mods/blob/f7e8416f994738293cb39fea75cc9f0ba387e91a/claude-mermaid/hooks/register.ts) | [MIT](https://github.com/galElmalah/claude-mods/blob/f7e8416f994738293cb39fea75cc9f0ba387e91a/LICENSE) |
| [prompt-queue](https://github.com/galElmalah/claude-mods/tree/main/claude-queue) | galElmalah | [Source](https://github.com/galElmalah/claude-mods/blob/f7e8416f994738293cb39fea75cc9f0ba387e91a/claude-queue/hooks/register.ts) | [MIT](https://github.com/galElmalah/claude-mods/blob/f7e8416f994738293cb39fea75cc9f0ba387e91a/LICENSE) |
| [mission-control](https://github.com/hamzafer/claude-code-mods/tree/main/mods/mission-control) | hamzafer | [Source](https://github.com/hamzafer/claude-code-mods/blob/11abba8c305b0d7563e1c89254c6d5e708746b47/mods/mission-control/hooks/register.tsx) | [MIT](https://github.com/hamzafer/claude-code-mods/blob/11abba8c305b0d7563e1c89254c6d5e708746b47/LICENSE) |
| [blast-radius](https://github.com/hamzafer/claude-code-mods/tree/main/mods/blast-radius) | hamzafer | [Source](https://github.com/hamzafer/claude-code-mods/blob/11abba8c305b0d7563e1c89254c6d5e708746b47/mods/blast-radius/hooks/register.tsx) | [MIT](https://github.com/hamzafer/claude-code-mods/blob/11abba8c305b0d7563e1c89254c6d5e708746b47/LICENSE) |
| [md-preview](https://github.com/hamzafer/claude-code-mods/tree/main/mods/md-preview) | hamzafer | [Source](https://github.com/hamzafer/claude-code-mods/blob/11abba8c305b0d7563e1c89254c6d5e708746b47/mods/md-preview/hooks/register.tsx) | [MIT](https://github.com/hamzafer/claude-code-mods/blob/11abba8c305b0d7563e1c89254c6d5e708746b47/LICENSE) |
| [now-playing](https://github.com/hamzafer/claude-code-mods/tree/main/mods/now-playing) | hamzafer | [Source](https://github.com/hamzafer/claude-code-mods/blob/11abba8c305b0d7563e1c89254c6d5e708746b47/mods/now-playing/hooks/register.tsx) | [MIT](https://github.com/hamzafer/claude-code-mods/blob/11abba8c305b0d7563e1c89254c6d5e708746b47/LICENSE) |
| [terminal-browser](https://github.com/zenbu-labs/terminal-browser/tree/main/claude-code-plugin) | zenbu-labs | [Source](https://github.com/zenbu-labs/terminal-browser/blob/2165ae76c9639e3996829ab0e6d54ddbd4f06ad8/claude-code-plugin/hooks/register.tsx) | [MIT](https://github.com/zenbu-labs/terminal-browser/blob/2165ae76c9639e3996829ab0e6d54ddbd4f06ad8/LICENSE) |
| [image-view](https://github.com/jarrodwatts/claude-image-view) | jarrodwatts | [Source](https://github.com/jarrodwatts/claude-image-view/blob/370b8e7bc0708bebe9762e63534f7ca18bc3e802/hooks/register.tsx) | [MIT](https://github.com/jarrodwatts/claude-image-view/blob/370b8e7bc0708bebe9762e63534f7ca18bc3e802/LICENSE) |
| [prismantis](https://github.com/NahumLitvin/prismantis) | NahumLitvin | [Source](https://github.com/NahumLitvin/prismantis/blob/03375f7e5245b41babfe31299f99924177b10a94/hooks/register.tsx) | [MIT](https://github.com/NahumLitvin/prismantis/blob/03375f7e5245b41babfe31299f99924177b10a94/LICENSE) |
| [flightdeck](https://github.com/scasella/claude-flightdeck) | scasella | [Source](https://github.com/scasella/claude-flightdeck/blob/830c4de3692a9c9d7f2d226b6d9988e6333cff94/hooks/register.tsx) | [MIT](https://github.com/scasella/claude-flightdeck/blob/830c4de3692a9c9d7f2d226b6d9988e6333cff94/LICENSE) |
| [filetree](https://github.com/data-goblin/claude-code-filetree) | data-goblin | [Source](https://github.com/data-goblin/claude-code-filetree/blob/b0e4098b66718c8aa99e4886b8f400d89c4cb2cc/hooks/register.tsx) | [MIT](https://github.com/data-goblin/claude-code-filetree/blob/b0e4098b66718c8aa99e4886b8f400d89c4cb2cc/LICENSE) |
| [prompt-rail](https://github.com/oikon48/prompt-rail/tree/main/plugins/prompt-rail) | oikon48 | [Source](https://github.com/oikon48/prompt-rail/blob/2ac50fb87fc426fed89ba0f09f1784ef6f289ae8/plugins/prompt-rail/hooks/index.tsx) | [MIT](https://github.com/oikon48/prompt-rail/blob/2ac50fb87fc426fed89ba0f09f1784ef6f289ae8/LICENSE) |
| [pull-request-pane](https://github.com/meganemura/pull-request-pane/tree/main/plugin) | meganemura | [Source](https://github.com/meganemura/pull-request-pane/blob/2b072514053814083609a3e6b45ca4d602448f9f/plugin/hooks/mod.ts) | [MIT](https://github.com/meganemura/pull-request-pane/blob/2b072514053814083609a3e6b45ca4d602448f9f/LICENSE) |
| [taskline](https://github.com/pepperonas/taskline) | pepperonas | [Source](https://github.com/pepperonas/taskline/blob/1b69e4216559f916c4cb31c5140c19f9c3c70410/hooks/register.tsx) | [MIT](https://github.com/pepperonas/taskline/blob/1b69e4216559f916c4cb31c5140c19f9c3c70410/LICENSE) |
| [clawd-buddy](https://github.com/FynnXland/fynn-mods/tree/main/mods/clawd-buddy) | FynnXland | [Source](https://github.com/FynnXland/fynn-mods/blob/4498aa6ce4b10006e6daf4f02bd6c3412afb308c/mods/clawd-buddy/hooks/register.ts) | [MIT](https://github.com/FynnXland/fynn-mods/blob/4498aa6ce4b10006e6daf4f02bd6c3412afb308c/LICENSE) |

For `Arunjay4213/claude-mods`, MIT is declared in the repository README; GitHub did not return a recognized SPDX license file during this review. The other reviewed additions have a repository MIT license. Listed packages retain their original authorship and licensing.

## Review notes

- `galElmalah/claude-mods` now uses the `gal-mods` marketplace and `mermaid-draw` / `prompt-queue` install ids; older search snippets still show the previous names.
- `now-playing` requires macOS and Spotify. `md-preview` needs Chrome and an image-capable terminal. `terminal-browser` needs its browser binary and a compatible terminal. Consult each source for current platform requirements.
- `taskline` and `prismantis` retain the in-session `/plugin` commands documented by their authors. Other entries show the source-documented CLI form.
- The website installation guide follows [Anthropic’s current mod guide](https://claude.dev/blog/getting-started-with-claude-code-mods/): mods are enabled by default from Claude Code 2.1.287; individual packages may require a newer version.
