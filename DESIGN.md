---
name: Modshelf
description: An illustrated community shelf for Claude Code mods.
colors:
  paper: "#faf8f4"
  ink: "#24241f"
  muted: "#5e6067"
  line: "#deddd7"
  rust: "#a94f34"
  soft: "#f4e8de"
  sage: "#dde4d5"
  white: "#fff"
  charcoal-action: "#262723"
  surface: "#fdfbf8"
  quiet-surface: "#eeeee6"
  command-panel: "#f0f1e8"
  command-surface: "#fbfbf5"
  terminal-ground: "#0d0d0d"
  terminal-text: "#dedede"
  terminal-muted: "#999999"
  terminal-bright-text: "#ffffff"
  terminal-border: "#303030"
  terminal-selection: "#53492e"
  terminal-red: "#ed7878"
  terminal-bright-red: "#ff9999"
  terminal-green: "#94ce85"
  terminal-bright-green: "#b6eea3"
  terminal-yellow: "#c8b65f"
  terminal-bright-yellow: "#f1db71"
  terminal-blue: "#86a8f5"
  terminal-bright-blue: "#acc5ff"
  terminal-magenta: "#cba0e0"
  terminal-bright-magenta: "#edbbff"
  terminal-cyan: "#83ccd7"
  terminal-bright-cyan: "#a8e9f0"
  terminal-orange: "#ff8800"
typography:
  display:
    fontFamily: "Newsreader, serif"
    fontWeight: 600
  headline:
    fontFamily: "Newsreader, serif"
    fontSize: "39px"
    fontWeight: 500
  title:
    fontFamily: "Newsreader, serif"
    fontSize: "26px"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "-0.015em"
  command-title:
    fontFamily: "Newsreader, serif"
    fontSize: "30px"
    fontWeight: 500
  command:
    fontFamily: "monospace"
    fontSize: "13px"
    lineHeight: 1.7
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "14px"
    fontWeight: 400
  label:
    fontFamily: "Inter, sans-serif"
    fontSize: "13px"
    fontWeight: 500
  note:
    fontFamily: "Inter, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.6
  terminal:
    fontFamily: "Menlo, Monaco, Consolas, monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.25
  game-control:
    fontFamily: "Inter, sans-serif"
    fontSize: "12px"
    fontWeight: 400
rounded:
  inset: "4px"
  control: "5px"
  surface: "7px"
spacing:
  tight: "10px"
  compact: "12px"
  group: "20px"
  section: "25px"
components:
  button-primary:
    backgroundColor: "{colors.rust}"
    textColor: "{colors.white}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 21px"
  button-primary-hover:
    backgroundColor: "#913f28"
  button-dark:
    backgroundColor: "{colors.charcoal-action}"
    textColor: "{colors.white}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 21px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 21px"
  category-active:
    backgroundColor: "{colors.soft}"
    textColor: "#94452e"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
  bookmark-saved:
    backgroundColor: "{colors.soft}"
    textColor: "{colors.rust}"
    rounded: "{rounded.inset}"
  code-block:
    backgroundColor: "{colors.quiet-surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "17px 19px"
  command-panel:
    backgroundColor: "{colors.command-panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
    padding: "26px"
  command-field:
    backgroundColor: "{colors.command-surface}"
    textColor: "{colors.ink}"
    typography: "{typography.command}"
    rounded: "{rounded.inset}"
    padding: "17px"
  copy-action:
    backgroundColor: "{colors.command-surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.inset}"
    padding: "8px 10px"
    height: "44px"
  demo-action:
    backgroundColor: "{colors.soft}"
    textColor: "{colors.rust}"
    rounded: "{rounded.control}"
    height: "44px"
  arcade-terminal:
    backgroundColor: "{colors.terminal-ground}"
    textColor: "{colors.terminal-text}"
    typography: "{typography.terminal}"
    rounded: "{rounded.surface}"
    padding: "18px"
  arcade-terminal-phone:
    padding: "12px"
  arcade-terminal-host:
    height: "324px"
  game-action-control:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.game-control}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "44px"
  game-direction-control:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.game-control}"
    rounded: "{rounded.control}"
    height: "44px"
    width: "44px"
---

# Design System: Modshelf

## Overview

**Creative North Star: "The Community Shelf"**

Modshelf combines warm paper, charcoal lettering, and hand-drawn objects into an approachable community catalog. The illustrations share ink contours, muted fills, and familiar desk materials; the surrounding interface gives titles, descriptions, and controls room to be read.

The same restrained controls and editorial type continue through repository contribution guidance, installation instructions, and mod details. Color marks actions and saved states; thin dividers and modest corners organize the rest. Embedded mod previews retain their native text interface inside this surrounding shelf treatment.

**Key Characteristics:**

- Warm ivory surfaces and charcoal ink.
- Newsreader headings paired with Inter controls and prose.
- One family of hand-drawn ink illustrations with muted color.
- Flat resting surfaces, soft hover depth, and visible keyboard focus.
- A short authored bookmark settle with reduced-motion support.
- Scoped native terminal text within the illustrated reading and control system.

## Colors

The palette uses warm neutrals for reading, rust for action, and sage for a quiet supporting accent. Frontmatter contains the normative values; the sidecar adds preview metadata.

### Primary

- **Rust:** primary actions, links in guidance, keyboard focus, wordmark detail, and saved bookmark ink. Primary buttons use a darker rust on hover.
- **Soft clay:** selected categories, saved bookmark backgrounds, and status messages.

### Secondary

- **Sage:** the opening background of the saved bookmark settle. Muted botanical greens also recur within the illustration family.

### Neutral

- **Paper:** the page and detail-dialog canvas.
- **Ink:** headings and primary reading text.
- **Muted:** descriptions, helper text, and secondary prose.
- **Line:** section dividers and internal card separation.
- **White:** text on solid action buttons.
- **Charcoal action:** the dark add-mod navigation action.
- **Surface:** catalog cards and filter selects.
- **Quiet surface:** code blocks and neutral hover treatments.
- **Command panel:** the pale sage-neutral surround for contribution skill instructions.
- **Command surface:** the lighter command inset and its copy action.

**The Action Ink Rule.** Use rust for actionable or selected states in the surrounding Modshelf interface; keep ordinary prose in ink or muted text.

### Scoped Terminal Theme

The cc-arcade preview uses the terminal color roles in frontmatter, independently of the catalog palette. Terminal ground supplies both the viewport and ANSI black; terminal foreground supplies ordinary text, ANSI white, and the cursor. Dim text carries trace, empty dots, status, and prompt rules. Bright text carries ANSI bright white and selected text; the selection role supplies its background. The perimeter is a fine charcoal border.

The theme includes red, green, yellow, blue, magenta, and cyan, each with its observed bright variant. The board uses this mapping:

| Value / state | Text treatment |
| --- | --- |
| Empty | Dim centered dot |
| 2 | Terminal foreground |
| 4 | Bright text |
| 8 | Yellow |
| 16 | Bright yellow |
| 32 | True-color orange |
| 64 | Red |
| 128 | Bold magenta |
| 256 | Bold bright magenta |
| 512 | Bold blue |
| 1024 | Bold cyan |
| 2048 | Bold green |
| Larger values | Bold bright green |

The box-character board border is yellow during play and red when no moves remain. Terminal keyboard focus repeats yellow; the supplemental controls retain the shelf's rust focus.

**The Terminal Color Rule.** Keep ANSI and true-color game states within terminal text; retain paper, ink, and rust for the surrounding shelf controls.

## Typography

**Display Font:** Newsreader, with serif fallback. The build self-hosts weights 400, 500, and 600.

**Body Font:** Inter, with sans-serif fallback. The build self-hosts weights 400, 500, and 600; normal interface text primarily uses 400 and 500.

**Terminal Font:** Menlo, Monaco, Consolas, monospace, scoped to the xterm preview and its loading/error notices. This operating-system monospace stack represents native terminal content; Newsreader remains the display voice.

**Character:** Newsreader gives headings a literary, human voice. Inter keeps the controls compact and the descriptions easy to scan. Commands, code, and the native terminal use monospace; ordinary prose retains Inter.

### Hierarchy

- **Display:** Newsreader at weight 600 for the main catalog statement and wordmark; secondary page titles inherit weight 500. The guide title steps from (60px) to (44px) on phones; contribution uses (58px) on desktop and inherits the shared (44px) phone title size.
- **Headline:** weight 500 at the frontmatter headline size for major catalog headings. Reading sections use a smaller tier (29px); contribution section headings move from (32px) to (29px).
- **Title:** card titles use the frontmatter title treatment, moving to (24px) in the intermediate layout and (28px) in the single-column phone catalog.
- **Body:** Inter at weight 400; general reading starts with the frontmatter body size. Catalog descriptions and detail prose use (15px); introductions use (16px). Longer prose uses line heights of (1.6–1.75).
- **Command title:** Newsreader at the frontmatter command-title size introduces each contribution skill.
- **Command:** monospace with the frontmatter command treatment; contribution commands become (12px) on narrow screens. Installation commands use (12px) with the same line height.
- **Label:** Inter at weight 500 for primary controls. Compact metadata and supporting notes use the smaller note tier.
- **Terminal:** the frontmatter terminal treatment is fixed across desktop and phone widths. ANSI bold distinguishes bracketed actions, the terminal heading, and values from 128 upward; score and best are inline terminal text at the same cell size.
- **Game control:** the frontmatter game-control treatment applies to the supplemental Play, Restart, and Undo labels outside the terminal.

**The Two Voices Rule.** Use Newsreader for headings and Inter for controls and prose; reserve monospace for commands, code, and native terminal content.

**The Terminal Cell Rule.** Preserve the terminal font size and cell geometry across viewport sizes; reflow the surrounding controls and context rather than enlarging game numerals or turning text cells into filled tiles.

## Layout

The main container centers at a maximum width of (1320px), with desktop side margins of (60px). At (1150px) and below, the side margins become (36px); at (760px) and below they become (20px). The installation guide uses a narrower centered container, capped at (880px). Contribution extends that reading layout to (1100px); both keep introductions within (640px).

The catalog combines a category rail and grid, separated by a thin vertical divider. The rail starts at (228px), narrows to (195px) in the intermediate layout, then becomes a labeled select on phones. Cards use three columns on large screens, two at (1150px) and below, and one at (480px) and below. Desktop card gaps are (20px) vertically and (18px) horizontally; phone gaps become (18px) and (14px).

Contribution pairs the introduction and illustration in a (1.4fr / 1fr) grid with a (30px) gap. Its ordered guidance uses three columns with (38px) gaps; two full-width command panels follow vertically. At (700px) and below, the introduction and guidance become single columns, step gaps become (28px), and command-panel padding reduces from (26px) to (20px).

The arcade demo caps its shared container at (1040px). The terminal occupies the full available width, followed by controls, instructions, and supporting context, with a (44px) gap between the game section and context. The terminal host remains (324px) high with (18px) desktop inset padding. Its compact text board stays at the left of the broader terminal viewport rather than stretching to fill it. Below a fine top divider, the original illustration occupies a (180px) column beside creator, source, license, and installation context, with a (32px) column gap and (32px) top padding. At (760px) and below, the terminal inset becomes (12px), the section gap becomes (32px), and context stacks with (24px) top padding and a centered illustration capped at (200px). Supplemental controls wrap into separate direction and action groups with a (12px) group gap; every button retains its (44px) height.

On desktop viewports at least (761px) wide and at most (800px) high, the arcade title steps from (60px) to (48px), the page top margin becomes (12px), and the back link and lead-in spacing tighten. The terminal host and font stay the same size. Phone titles use (43px). This height-sensitive title and spacing treatment belongs to the arcade surface.

Shared controls use close internal grouping and larger gaps between sections. Icon controls and category/filter selects are at least (44px) on phones; contribution copy actions retain a (44px) minimum height at all widths. The compact header navigation disappears at the phone breakpoint while the wordmark and add-mod action remain.

**The Reflow Rule.** Use each surface's observed breakpoint to collapse category controls into a labeled select and stack paired content or ordered guidance; preserve readable titles and reachable actions.

## Elevation & Depth

Resting cards and inputs are flat: quiet surface shifts, fine borders, and dividers establish structure. Cards gain a faint, softly blurred shadow only for hover on a fine pointer. The detail dialog uses a deeper ambient shadow and translucent charcoal backdrop to separate an active layer. Focus outlines are interaction feedback, not surface elevation. The arcade terminal is a flat dark ground with a fine perimeter, without a shadow. Its active input outline uses terminal yellow (1px) at an offset of (6px); external controls retain the shared rust outline.

### Shadow Vocabulary

- **Card hover** (`0 6px 18px #27291b09`): subtle pointer feedback with a stronger border.
- **Dialog** (`0 18px 70px #282a2438`): separation for the active mod-detail layer.

**The Quiet Depth Rule.** Keep catalog surfaces flat at rest; use the existing soft shadow only for hover or the active detail layer.

## Shapes

Corners are modest: buttons use the control radius, cards, search, and command panels use the surface radius, and inset artwork, commands, and icon controls use the inset radius. Borders are fine and neutral; the illustration silhouettes carry the organic character. Empty states use dashed outlines to distinguish their function. The detail dialog is the larger rounded exception (12px).

The arcade terminal surround uses the surface radius and its external controls use the control radius. Inside it, the board is a (27-column), six-line text box: rounded box characters enclose four rows of four right-aligned values or centered dots, each cell occupying six character columns. The box is text geometry rather than a CSS card; cells have no background fills, individual borders, or radii.

## Components

### Buttons

Compact, confident actions with a text label and optional SVG arrow. Shared buttons have a minimum height of (48px); the header and main catalog action adjust their dimensions for their placement. Primary buttons use rust and white, add-mod navigation uses charcoal and white, and secondary actions use an outlined transparent surface. Repository actions pair a small branch icon with the label. Background and color transitions last (150ms); press feedback scales to (0.98). Hover treatments apply only to a fine pointer. Disabled buttons fade to (0.65) opacity and retain their label.

### Cards / Containers

Illustration-led catalog entries use a fine border, a lightly tinted surface, an inset art bay, a serif title, a short description, and a divided author/bookmark footer. Art remains fully visible with `object-fit: contain`; catalog images blend gently into their bay using `mix-blend-mode: multiply`. The active detail layer repeats the illustration, title, description, and installation vocabulary.

### Inputs / Fields

Search uses a wide pale field with an SVG search icon, larger inset spacing, and a rust border on focus. Category and sort controls retain native selects within modest borders. Keyboard focus uses a rust outline (2px) with an offset of (4px).

### Navigation

Header navigation is plain Inter text with rust hover feedback. Category navigation uses small stroked SVG icons and left-aligned labels; active entries use a soft-clay fill and darker rust text. The phone category selector retains a visible label. The installation-guide link carries a fine underline, and reading links underline their rust text.

### Bookmarks

A saved bookmark fills the SVG in rust against soft clay. Its authored settle lasts (220ms) with `cubic-bezier(0.16, 1, 0.3, 1)`: it begins on sage, raised slightly and rotated, then settles into the saved state. The control exposes its pressed state and an accessible action label. Reduced-motion preferences remove animations and transition duration, restore ordinary scrolling, and remove button press transforms.

### Installation Blocks

Commands use a quiet neutral surface, a fine border, modest corners, and a small outline copy action. Code wraps within its container; spacing and line height preserve command readability on phones. Monospace stays within code, command, and native terminal contexts.

### Contribution Command Panels

Each skill uses a pale sage-neutral panel with a serif title and copy action on one row, followed by descriptive prose, a lighter command inset, and a plain source link. Panel padding follows the frontmatter command-panel token; narrow screens reduce it to (20px). Commands wrap and reduce their inset padding from (17px) to (13px) below the contribution breakpoint. Copy uses a small stroked SVG, changes its label to “Copied” on success, and offers text recovery when clipboard access fails.

### Ordered Guidance

Contribution steps use an unboxed ordered list, a rust serif ordinal, a serif title, and muted prose. Thin horizontal dividers separate the larger sections. The visible numbers express the actual fork, prepare, and review sequence; the list becomes vertical on narrow screens.

### Demo Actions

A playable catalog entry adds a labeled soft-clay link below its author/bookmark footer. It uses rust text, a fine clay border, the control radius, a minimum height of (44px), and small stroked gamepad and arrow SVGs. Fine-pointer hover deepens the clay fill; keyboard focus retains the shared rust outline. The detail layer uses the existing rust button for the same “Try this mod” action.

### Arcade Terminal and Controls

A functioning xterm.js frontend renders the original cc-arcade text board on the scoped terminal ground and font. The terminal contains a short preview trace, native bracketed games/close actions, the compact six-line board, inline score/controls/best status, and a visible prompt between dim horizontal rules. The board's shape and colors follow the scoped terminal rules above. Text lines clip to the available terminal columns; the fixed cell size remains readable on phones. The original hand-drawn arcade illustration and creator, installation, source, and license context follow below the game section.

Clicking the board gives it keyboard focus. Arrows or WASD move, R restarts, and Esc returns input to the visible prompt. Native bracketed actions respond to terminal clicks: games opens the limited picker, 2048 starts a game, and close leaves the prompt. The prompt supports `/arcade`, `/arcade 2048`, and `/arcade stop`; unsupported commands explain that limited set. Tab can leave the terminal. The game continues automatically after reaching 2048, and best records completed-game scores within the current preview session.

The external control row places four (44px) square directional SVG buttons opposite labeled Play, Restart, and Undo buttons at the same height. All use a fine neutral border, transparent resting fill, and quiet-surface hover over (120ms). Labels and SVGs are grouped with a (7px) gap; buttons within each group use an (8px) gap. Unavailable actions fade to (0.45) opacity. A muted instruction line and a smaller preview-status note follow. Loading and failure notices remain within the terminal ground; failure offers a labeled retry action.

Moves update immediately without decorative animation or a blinking cursor. Reduced-motion preferences remove external control transitions. Swipes belong to the text board, pinch zoom remains available, and the page scrolls outside it. A separate accessible grid and polite state announcements accompany terminal output. The visible preview note states that only 2048 runs locally and no Claude session is connected; the terminal does not fabricate model output, usage counters, or connected status.

## Do's and Don'ts

### Do:

- **Do** use the paper, ink, and rust roles consistently across catalog, contribution, and guidance.
- **Do** continue the hand-drawn ink illustration family with muted fills and fully visible objects.
- **Do** keep visible labels, rust keyboard focus, and the established phone control sizes.
- **Do** preserve the authored bookmark state change and reduced-motion behavior.
- **Do** preserve native terminal text geometry and ANSI states within mod previews while retaining the shelf treatment around them.

### Don't:

- **Don't** replace the heading and body pairing with a single display voice.
- **Don't** add resting card shadows when a surface tone and fine border provide the existing separation.
- **Don't** use monospace for ordinary shelf descriptions or external action labels.
- **Don't** crop catalog illustrations into generic icon badges.
- **Don't** replace the cc-arcade terminal with filled tiles, serif numerals, or a separate score-card toolbar.
