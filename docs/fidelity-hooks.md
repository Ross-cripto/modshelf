# Terminal fidelity: hook-driven demos

Audit date: 2026-10-12. This review covers quota-meter, token-ledger, budget-guard, mermaid-draw, prompt-queue, mission-control, blast-radius, md-preview and now-playing. Official GitHub repository metadata, default-branch commit metadata, recursive trees and file contents were read through the GitHub API. All nine cached `work/mod-research/verified/<id>/hook-source.txt` files match the current official registration files byte for byte.

The renderer uses the actual plugin labels, default activation, terminal glyphs, ANSI roles, action ordering and lifecycle. Account usage, project files, model answers, file impact and music remain browser-local input fixtures. The browser does not load plugin code, execute commands or call Claude, Spotify, LRCLIB, GitHub rendering or repository services.

## Source revisions

| Repository | Pinned and current SHA | Current commit date | Mods |
| --- | --- | --- | --- |
| [Arunjay4213/claude-mods](https://github.com/Arunjay4213/claude-mods/tree/d4fffd7de9204a62b10e7b3604fc893158fa25fd) | `d4fffd7de9204a62b10e7b3604fc893158fa25fd` | 2026-09-15 | quota-meter, token-ledger, budget-guard |
| [galElmalah/claude-mods](https://github.com/galElmalah/claude-mods/tree/f7e8416f994738293cb39fea75cc9f0ba387e91a) | `f7e8416f994738293cb39fea75cc9f0ba387e91a` | 2026-10-10 | mermaid-draw, prompt-queue |
| [hamzafer/claude-code-mods](https://github.com/hamzafer/claude-code-mods/tree/11abba8c305b0d7563e1c89254c6d5e708746b47) | `11abba8c305b0d7563e1c89254c6d5e708746b47` | 2026-10-11 | mission-control, blast-radius, md-preview, now-playing |

## Changes

| Mod | Before | After | Why |
| --- | --- | --- | --- |
| quota-meter | No reading until the first reply; `5-hour window`; static reset; missing burn/projection | Session-start fixture reading; `5-hour limit` and `7-day limit`; sampled countdown; native burn collection, projection, reset detection and 240-sample cap | The real hook samples on startup as well as completion and the 60-second timer. |
| token-ledger | Five wide columns, integer token strings, three-decimal dollars, eight rows, fresh input only in status | Native nine-column table, priority-based column removal, short token strings, four-decimal small costs, 40 drawn rows, total input including cache, per-row deltas and subagent metadata | The helper defines exact formatting and adaptive column priorities. Cumulative cost must not be charged again after history truncation. |
| budget-guard | Forced $0.02 startup cap; cost-only warning; warning disappears during override | Native cost guard disabled initially, 90%/95% window limits, 80% warning point; native question and warning text; override leaves readings visible | Overrides change blocking, not the status reading. |
| mermaid-draw | ASCII off disables rendering; three-row invented boxes; every character cyan; forced horizontal layout on phones | ASCII toggles glyphs; exact upstream five-row horizontal / 25-row vertical fixture geometry; plain labels, cyan borders/junctions, dim connectors, yellow arrows; width-aware layout | `ascii` chooses character set. The native renderer selects the sideways version only when it fits without losing content. |
| prompt-queue | Detached action rows at every width; altered state labels; missing idle send and steer removal | Native state labels and rounded frame; controls beside their prompt at sufficient width; stable empty arrow slots; idle send; steered-row cancel; narrow rows retain every target | The source spends cyan on the steer and send routes and keeps row controls aligned. |
| mission-control | Pane opens at startup; invented checkmarks; no source summary band; fixed short graphic | Command opens the pane; native `◆`, `●`, `◉`, `✎`, `$` tree and counts; above-prompt summary independent of the pane, expiring 30 seconds after completion; native image proportions | Activation, tree roles and band lifetime come from separate hooks. |
| blast-radius | Missing risk kind; generic invented effect text; an unrecognized migration command | Native `Deletes files`, `Force push`, `Database migration` labels; red heading prefix and dim risk kind; all five measured delete fixture paths; recognized Prisma command; Cancel precedes Proceed; 60-second countdown | The real mod classifies the Bash command and shows the measured result before allowing it. |
| md-preview | Persistent invented status; two files before both were edited; raw Markdown in Text mode; missing Render/Browser | Event notification, separate opened/edited paths, colored headings and dim rules, native changed-chunk bars, Before/After snapshots, distinct two-file comparison, Render/Browser controls, shared fixture data | Opening an existing file creates no before snapshot or edit marks. The source tracks successful Markdown writes and renders structured Markdown in both views. |
| now-playing | Separate song, progress and transport rows; block bar; fixed lyric throughout track | One-line track/artist/progress/time/transport, `🎵`, native 12-cell `━`/`─` progress, adjacent transport buttons, lyric on its own line, timed lyric changes, paused hiding of progress/time/lyrics | The native transport stays visible as narrow widths truncate time and progress first. |

## Per-mod evidence and behavior

### quota-meter

- [register.tsx:86–113](https://github.com/Arunjay4213/claude-mods/blob/d4fffd7de9204a62b10e7b3604fc893158fa25fd/plugins/quota-meter/hooks/register.tsx#L86): session start restores samples, registers `/quota`, samples once and starts the 60-second timer. `turn.complete` samples after the host finishes.
- [register.tsx:124–172](https://github.com/Arunjay4213/claude-mods/blob/d4fffd7de9204a62b10e7b3604fc893158fa25fd/plugins/quota-meter/hooks/register.tsx#L124): `/quota` toggles the pane; the pane itself proves that it remains open after module reload.
- [register.tsx:174–218](https://github.com/Arunjay4213/claude-mods/blob/d4fffd7de9204a62b10e7b3604fc893158fa25fd/plugins/quota-meter/hooks/register.tsx#L174): one padded block per window, bar, reset, burn, projection and native footer. There is no custom Close button in the body.
- [quota.ts:17–31](https://github.com/Arunjay4213/claude-mods/blob/d4fffd7de9204a62b10e7b3604fc893158fa25fd/plugins/quota-meter/hooks/quota.ts#L17), [quota.ts:78–113](https://github.com/Arunjay4213/claude-mods/blob/d4fffd7de9204a62b10e7b3604fc893158fa25fd/plugins/quota-meter/hooks/quota.ts#L78), [quota.ts:219–294](https://github.com/Arunjay4213/claude-mods/blob/d4fffd7de9204a62b10e7b3604fc893158fa25fd/plugins/quota-meter/hooks/quota.ts#L219): native names, capped sample history, reset detection, slope thresholds, colors and text.

Default: pinned status, detail pane closed. The fixture starts at 42% / 18%; completed readings remain unchanged during the next tool sequence. Reset clocks and account values are fictional. The clock reconstructs local 60-second and completion samples and drops the slope on a percentage reset. The 5-hour projection needs 15 minutes of sample span; the 7-day one needs 8h24m. No subscription endpoint is contacted.

### token-ledger

- [register.tsx:22–28](https://github.com/Arunjay4213/claude-mods/blob/d4fffd7de9204a62b10e7b3604fc893158fa25fd/plugins/token-ledger/hooks/register.tsx#L22): 200 stored rows, 40 drawn, oldest-first bookkeeping and newest-first display.
- [register.tsx:103–137](https://github.com/Arunjay4213/claude-mods/blob/d4fffd7de9204a62b10e7b3604fc893158fa25fd/plugins/token-ledger/hooks/register.tsx#L103): cost is a change in the host session total; records contain model, fresh input, output, cache read/write, elapsed time and whether the finished turn is a subagent.
- [register.tsx:180–276](https://github.com/Arunjay4213/claude-mods/blob/d4fffd7de9204a62b10e7b3604fc893158fa25fd/plugins/token-ledger/hooks/register.tsx#L180): serialized completion recording, `/ledger` toggle and native pane rows.
- [format.ts:63–162](https://github.com/Arunjay4213/claude-mods/blob/d4fffd7de9204a62b10e7b3604fc893158fa25fd/plugins/token-ledger/hooks/format.ts#L63), [format.ts:175–246](https://github.com/Arunjay4213/claude-mods/blob/d4fffd7de9204a62b10e7b3604fc893158fa25fd/plugins/token-ledger/hooks/format.ts#L175): shortened token counts, four decimals below $1, cache share over all input, native columns and adaptive priority removal.

Default: pinned `$0.0000 session · no turns yet - /ledger`, pane closed. In-flight streaming does not add a row. Metadata supports native `*` and dim styling for subagent completions, and recorded deltas survive the 200-row retention boundary. Model and usage are fixture data; no pricing table or real account calculation runs. Main-turn and agent completion events must be supplied by the shared simulator, never guessed from a renderer tick.

### budget-guard

- [guard.ts:29–35](https://github.com/Arunjay4213/claude-mods/blob/d4fffd7de9204a62b10e7b3604fc893158fa25fd/plugins/budget-guard/hooks/guard.ts#L29): defaults are cost 0, 5-hour 90%, 7-day 95%, warning 80%, block mode, enabled.
- [guard.ts:84–87](https://github.com/Arunjay4213/claude-mods/blob/d4fffd7de9204a62b10e7b3604fc893158fa25fd/plugins/budget-guard/hooks/guard.ts#L84), [guard.ts:155–171](https://github.com/Arunjay4213/claude-mods/blob/d4fffd7de9204a62b10e7b3604fc893158fa25fd/plugins/budget-guard/hooks/guard.ts#L155): reaching a limit counts as over; cost has precedence over 5-hour and 7-day; status appears at warning or over and includes all enabled figures.
- [register.tsx:228–279](https://github.com/Arunjay4213/claude-mods/blob/d4fffd7de9204a62b10e7b3604fc893158fa25fd/plugins/budget-guard/hooks/register.tsx#L228): before-tool sampling and refusal stop the turn; warn mode and a one-turn override permit it.
- [register.tsx:284–312](https://github.com/Arunjay4213/claude-mods/blob/d4fffd7de9204a62b10e7b3604fc893158fa25fd/plugins/budget-guard/hooks/register.tsx#L284): ordinary new prompts get the native question and `Send anyway` / `Do not send`; slash commands continue to work.
- [guard.ts:229–252](https://github.com/Arunjay4213/claude-mods/blob/d4fffd7de9204a62b10e7b3604fc893158fa25fd/plugins/budget-guard/hooks/guard.ts#L229): command validation and 0 disabling a figure.

Default: no dashboard, no forced cost cap. The local $0.02 control is an explicit experiment. The status stays visible during an override because the reading still exceeds its limit. The gate wraps its complete question on phones. Fixture account costs and rate windows drive guards; no actual operation is billed or blocked.

### mermaid-draw

- [register.ts:24–33](https://github.com/galElmalah/claude-mods/blob/f7e8416f994738293cb39fea75cc9f0ba387e91a/claude-mermaid/hooks/register.ts#L24): colored output has a three-column margin, plain output six; defaults ASCII false, color true, LR true.
- [register.ts:79–130](https://github.com/galElmalah/claude-mods/blob/f7e8416f994738293cb39fea75cc9f0ba387e91a/claude-mermaid/hooks/register.ts#L79): only closed Mermaid blocks replace the assistant message; surrounding prose remains.
- [register.ts:134–152](https://github.com/galElmalah/claude-mods/blob/f7e8416f994738293cb39fea75cc9f0ba387e91a/claude-mermaid/hooks/register.ts#L134): `ascii`, `color`, `lr` and `reset` change preferences; ASCII off never disables the renderer.
- [diagrams.ts:26–40](https://github.com/galElmalah/claude-mods/blob/f7e8416f994738293cb39fea75cc9f0ba387e91a/claude-mermaid/hooks/diagrams.ts#L26), [diagrams.ts:117–125](https://github.com/galElmalah/claude-mods/blob/f7e8416f994738293cb39fea75cc9f0ba387e91a/claude-mermaid/hooks/diagrams.ts#L117), [diagrams.ts:218–267](https://github.com/galElmalah/claude-mods/blob/f7e8416f994738293cb39fea75cc9f0ba387e91a/claude-mermaid/hooks/diagrams.ts#L218): fence recognition, width-aware layout selection and role palettes.

The official vendored renderer was executed locally for `graph TD\n  Request --> Plan --> Result`, with both character sets and TD/LR directions. The demo's art geometry follows those four outputs: 39-column/five-row LR and eleven-column/25-row TD. Narrow widths preserve the vertical version. Labels remain ordinary terminal text; only their structural roles receive color. Completed graphs remain rendered in conversation history during later prompts. Unfinished fences and unsupported graphs, including extra edges, keep their complete source. Browser-local replies choose this fixed graph; arbitrary model-generated Mermaid is not produced or fetched.

### prompt-queue

- [register.ts:68–80](https://github.com/galElmalah/claude-mods/blob/f7e8416f994738293cb39fea75cc9f0ba387e91a/claude-queue/hooks/register.ts#L68): native state labels and accent rules.
- [register.ts:125–173](https://github.com/galElmalah/claude-mods/blob/f7e8416f994738293cb39fea75cc9f0ba387e91a/claude-queue/hooks/register.ts#L125): dispatch waits 5.2 seconds between plugin prompts and is deferred outside the hook dispatch.
- [register.ts:237–251](https://github.com/galElmalah/claude-mods/blob/f7e8416f994738293cb39fea75cc9f0ba387e91a/claude-queue/hooks/register.ts#L237): ▶ sends the selected entry to the front while idle and steers the running turn while busy.
- [register.ts:254–368](https://github.com/galElmalah/claude-mods/blob/f7e8416f994738293cb39fea75cc9f0ba387e91a/claude-queue/hooks/register.ts#L254): round dim border, bold count, aligned row buttons, stable arrow placeholders, editable row, steer cancel and idle-only send.
- [register.ts:409–459](https://github.com/galElmalah/claude-mods/blob/f7e8416f994738293cb39fea75cc9f0ba387e91a/claude-queue/hooks/register.ts#L409): main completion drains once; steering follows the next successful main tool result and is returned to the stack when a turn ends without consuming it.
- [register.ts:483–537](https://github.com/galElmalah/claude-mods/blob/f7e8416f994738293cb39fea75cc9f0ba387e91a/claude-queue/hooks/register.ts#L483): native `/q` list, status, clear, up/down/mv, now, remove, edit and send semantics.

Default: absent until explicit `/q` entries exist; ordinary Enter is never silently queued. Desktop controls share their prompt row. On narrow browser terminals the same controls occupy a following row so each remains clickable. This is a fit adaptation, with native labels and action order retained. The browser edit path fills the composer, matching the source fallback when the inline field cannot take focus. Local fixture turns provide successful tool/completion/Stop events. No plugin-to-engine network dispatch runs.

### mission-control

- [register.tsx:53–63](https://github.com/hamzafer/claude-code-mods/blob/11abba8c305b0d7563e1c89254c6d5e708746b47/mods/mission-control/hooks/register.tsx#L53): registration does not open a pane.
- [register.tsx:65–136](https://github.com/hamzafer/claude-code-mods/blob/11abba8c305b0d7563e1c89254c6d5e708746b47/mods/mission-control/hooks/register.tsx#L65): main, agent and tool nodes come from their own events; main completion closes its own leftovers.
- [register.tsx:139–208](https://github.com/hamzafer/claude-code-mods/blob/11abba8c305b0d7563e1c89254c6d5e708746b47/mods/mission-control/hooks/register.tsx#L139): `/mission` opens the selected view, `Who`/`Code`/`Close`, native counts, colors and image dimensions.
- [register.tsx:212–231](https://github.com/hamzafer/claude-code-mods/blob/11abba8c305b0d7563e1c89254c6d5e708746b47/mods/mission-control/hooks/register.tsx#L212): blue `◈ mission:` band while active and for 30 seconds after completion, independently of pane visibility.
- [tree.ts:21–29](https://github.com/hamzafer/claude-code-mods/blob/11abba8c305b0d7563e1c89254c6d5e708746b47/mods/mission-control/hooks/tree.ts#L21), [tree.ts:51–67](https://github.com/hamzafer/claude-code-mods/blob/11abba8c305b0d7563e1c89254c6d5e708746b47/mods/mission-control/hooks/tree.ts#L51): role icons, elapsed time and depth-first family-grouped tree text.
- [map.ts:90–94](https://github.com/hamzafer/claude-code-mods/blob/11abba8c305b0d7563e1c89254c6d5e708746b47/mods/mission-control/hooks/map.ts#L90), [map.ts:166–192](https://github.com/hamzafer/claude-code-mods/blob/11abba8c305b0d7563e1c89254c6d5e708746b47/mods/mission-control/hooks/map.ts#L166): native map palette and header.

Default: pane closed. The activity band uses actual completion/stop timestamps, including on a second turn. Who shows the fixture main, test reviewer and read/edit/check activity using the source icons and color roles. Code reserves a 16:10-style image region. File/import data and summaries are fixture outputs; no filesystem scan, Chrome process or summary model runs.

### blast-radius

- [register.tsx:27–105](https://github.com/hamzafer/claude-code-mods/blob/11abba8c305b0d7563e1c89254c6d5e708746b47/mods/blast-radius/hooks/register.tsx#L27): before-Bash classification, one held call, pane/band placement, 60-second timeout, cancellation and proceeding.
- [register.tsx:132–155](https://github.com/hamzafer/claude-code-mods/blob/11abba8c305b0d7563e1c89254c6d5e708746b47/mods/blast-radius/hooks/register.tsx#L132): exact risk names, red heading, yellow command, bold summary, dim details, auto-focused Cancel, Proceed and countdown.
- [register.tsx:167–185](https://github.com/hamzafer/claude-code-mods/blob/11abba8c305b0d7563e1c89254c6d5e708746b47/mods/blast-radius/hooks/register.tsx#L167): recursive delete, force-push and explicitly named migration commands.
- [register.tsx:219–238](https://github.com/hamzafer/claude-code-mods/blob/11abba8c305b0d7563e1c89254c6d5e708746b47/mods/blast-radius/hooks/register.tsx#L219): measured delete and commit phrasing; schema impact explicitly not previewable.

Default: no passive pane. Fixture requests lead to `rm -rf ./dist`, `git push --force origin feature/demo` or `npx prisma migrate deploy`. Header risk kind and measured-summary grammar follow the source. The delete fixture measures five named paths totaling 240 KB, and the full pane lists all five; no band-only omission marker is invented in the pane. Paths, file sizes and commit counts are fictional. Native c/y actions and automatic cancellation govern the held local event. No shell or Git operation runs. On narrow terminals explanations and countdown wrap while both decisions remain reachable.

### md-preview

- [register.tsx:155–190](https://github.com/hamzafer/claude-code-mods/blob/11abba8c305b0d7563e1c89254c6d5e708746b47/mods/md-preview/hooks/register.tsx#L155): successful main Markdown Edit/Write/replace calls track before snapshots; denied, failed and agent edits do not trigger that path; shell snapshot detection occurs at main completion.
- [register.tsx:196–287](https://github.com/hamzafer/claude-code-mods/blob/11abba8c305b0d7563e1c89254c6d5e708746b47/mods/md-preview/hooks/register.tsx#L196): exact `Prev`/`Next`/`Before` or `Single`/`Render`/`Text` or `Page`/`Browser`/`Close` controls, rendered-page images, parsed Text blocks and green change marks.
- [register.tsx:306–331](https://github.com/hamzafer/claude-code-mods/blob/11abba8c305b0d7563e1c89254c6d5e708746b47/mods/md-preview/hooks/register.tsx#L306): same-file before/after differs from a pair of files; pair comparison marks changes on the second file.
- [register.tsx:336–372](https://github.com/hamzafer/claude-code-mods/blob/11abba8c305b0d7563e1c89254c6d5e708746b47/mods/md-preview/hooks/register.tsx#L336): `/md`, explicit path, two-file compare and browser command semantics.
- [register.tsx:436–491](https://github.com/hamzafer/claude-code-mods/blob/11abba8c305b0d7563e1c89254c6d5e708746b47/mods/md-preview/hooks/register.tsx#L436): tracked files, once-per-file-per-turn notification, wrapped navigation, rerender and view/compare toggles.
- [md.ts:346–399](https://github.com/hamzafer/claude-code-mods/blob/11abba8c305b0d7563e1c89254c6d5e708746b47/mods/md-preview/hooks/md.ts#L346), [md.ts:430–465](https://github.com/hamzafer/claude-code-mods/blob/11abba8c305b0d7563e1c89254c6d5e708746b47/mods/md-preview/hooks/md.ts#L430): blank-line chunk comparison, duplicate-chunk counts, first-block change marks, paragraph joining, magenta first/second-level headings and dim underline rules.

Default: pane closed, Page view. `/md README.md` can open the existing fixture before any edit. It shows the initial content without green bars; Before then reports `new file, no earlier version` because no edit snapshot exists. Successful edits emit a transient event notice without opening the pane or inventing a persistent plugin status. Rendering follows actual tracked file paths, edited-path metadata and the shared fixture module. Text mode hides Markdown heading syntax, uses native heading colors/rules, joins paragraph lines, wraps content and marks changed chunks with green bars. Before compares one file's snapshots; Pair compares two selected files and marks only the second side relative to the first. Render refreshes the local preview; Browser opens that local rendered view. No remote browser, GitHub renderer or filesystem access occurs.

### now-playing

- [register.tsx:49–82](https://github.com/hamzafer/claude-code-mods/blob/11abba8c305b0d7563e1c89254c6d5e708746b47/mods/now-playing/hooks/register.tsx#L49): music polling and playback clock are independent of Claude turns; the real mod activates only on macOS.
- [register.tsx:94–135](https://github.com/hamzafer/claude-code-mods/blob/11abba8c305b0d7563e1c89254c6d5e708746b47/mods/now-playing/hooks/register.tsx#L94): native one-line transport, `🎵` while playing, green thin bar, dim remaining bar/time, paused hiding of progress/time/lyrics and separate italic lyric row.
- [register.tsx:210–215](https://github.com/hamzafer/claude-code-mods/blob/11abba8c305b0d7563e1c89254c6d5e708746b47/mods/now-playing/hooks/register.tsx#L210): `/music` aliases and usage rejection.
- [register.tsx:238–262](https://github.com/hamzafer/claude-code-mods/blob/11abba8c305b0d7563e1c89254c6d5e708746b47/mods/now-playing/hooks/register.tsx#L238), [register.tsx:282–292](https://github.com/hamzafer/claude-code-mods/blob/11abba8c305b0d7563e1c89254c6d5e708746b47/mods/now-playing/hooks/register.tsx#L282): interpolated position, timed lyrics, 12-cell `━`/`─` bar and native clock format.

Default fixture: playing original fictional `Paper Satellites` by `Mira Vale`, with two other original tracks. Lyric lines change at 8, 35 and 60 seconds, respecting the native 0.3-second lead. Pause freezes the shared fixture clock and hides progress/time/lyrics. Next/previous and b/p/n controls work through idle/work/completion. The browser supplies a track fixture independent of host OS; it does not access Spotify, play audio or fetch lyrics.

## Validation

`node --experimental-strip-types --test tests/demo-views-hooks.test.ts` passed all 28 cases. They span startup, first work, completed usage, cost deltas, history truncation, subagent row metadata, guard overrides/windows, incomplete/completed Mermaid, ASCII and native role colors, phone layout fallback, indexed queue controls, steering cancel, native mission icons and counts, exact second-turn band expiry, all three blast risk kinds, Markdown opened/edited paths/Before/Pair/Page/Text/chunk styles, and independent playing/paused transport with timed lyrics and adjacent buttons. Regression cases were run failing before their fixes. `npx tsc --noEmit --incremental false` passed.

The parent integration owns command parsing, fixture event scheduling, shared types, completion retention/deltas, pane/band composition, map and Markdown image generation, transient notifications, keyboard handling and browser actions. Those files are intentionally outside this worker's ownership. Full lifecycle/build/phone-browser verification is performed after these renderers are integrated with the shared engine.
