# Native mod fidelity review

Base: main @ 9d1dd54d190ba04a73cc9bd240db644b7b657ae6
Branch: fix/native-mod-demo-fidelity
Scope: all 24 source comparisons, terminal adapters and lifecycle transitions, concise preview pages and catalog detail actions.

## Source comparison

The three family audits record pinned/current upstream revisions and exact hook/render references for every mod: docs/fidelity-core.md (7), docs/fidelity-hooks.md (9), docs/fidelity-panes.md (8). Current revisions were inspected from official GitHub repositories, including changed Prismantis and Flightdeck HEADs whose registration hooks match the earlier snapshots. Adapted Mindful Claude, Dino and Clawd artwork retains full upstream MIT notices.

## Independent code review

TypeScript reviewer: APPROVE. Resolved stopped Flowpane runs changing status on a later prompt, prompt rail truncating selected historical replies, and Mermaid accepting an unsupported graph containing extra edges. Regression tests cover each. A narrow Mermaid followup approved exact supported-fence matching and completed-history rendering.

React reviewer: scoped APPROVE. Named pure Markdown parsing replaces parsing inside render callbacks. PR text selection disables xterm mouse reporting and separates click controls from native drags; cleanup removes pointer listeners. Actual normal Mac browser drag was verified after the code review, retaining its quoted passage in a review comment.

## Verification

198 tests pass. Catalog validation covers all 24 mods. TypeScript and git diff whitespace checks pass. The production build generates all 24 demo routes; local HTTP checks return 200 for each and 404 for an unknown mod. Source archive tests verify contributor/source coverage and exclude local credentials. Final build and publication results are recorded in the pull request.

Browser checks: arbitrary prompt and playable 2048, desktop 1440, phone 390 and user-width 1280 layouts; normal Mac PR text selection and quoted feedback; native Browser Grab fills the composer without automatic submission; closed Mermaid renders in history while another prompt works. The original card-footer action placement was superseded by the screenshot correction recorded below.

## Fresh design review

Disposition: ship. The fresh full review covers the terminal correction and catalog action cleanup, with all five contract sections returned (persistence, fidelity, ceiling, material_fixes, keep) and no material fixes. All seven required evidence files were opened and validated: fidelity-desktop.jpg, fidelity-mobile.jpg, fidelity-user-1280.jpg, fidelity-user-1280-viewport.jpg, fidelity-pr-selection.jpg, fidelity-browser.jpg and fidelity-mermaid.jpg in .impeccable/review/. The full-page provider's skip-link overlay is a capture artifact; the native top viewport has no overlay.

The reviewer verified inherited type/material/ground, concise hierarchy, card-to-terminal flow, 44px phone actions, native pane/cell treatment and the source-audit boundaries. The inherited homepage reproduction gate at 0.8152 remains outside this scope. Existing narrow intentional Inter exception preserved; no new suppression. Final DESIGN.md and its sidecar are synchronized after review.

## Boundaries

These are scripted browser previews, not Claude Code or remote mod execution. Audits explicitly document fixtures for accounts, files, images, browser pages and Spotify; Arcade exposes 2048 only, Flowpane has reduced configuration, Dino samples slower physics and Clawd exposes selected native poses. Native event triggers, shown controls and terminal geometry follow the inspected sources, without claiming complete upstream runtime parity.

Publish the reviewed GitHub/main state to Vercel and synchronize the older Sites source with the same catalog/runtime. Sites retains owner-private access and its static-export hosting adaptation.

## Screenshot action-placement correction

Base: main @ 335b37a386e1a004fbfc1e3bf4354896b1971f7a
Branch: fix/demo-action-in-details

The user rejected the bottom buttons on catalog tiles and asked for the action inside the opened card. Catalog tiles now end at the author/bookmark footer. The details dialog has a single Try this mod link beside View source, using the existing button primitives. The unused tile-action styles were removed. Terminal behavior and source audits are unchanged.

Verification: production build passes with all 24 demo routes. Browser checks confirm zero Try links on the grid, one correctly targeted link inside the cctop dialog, and successful navigation to its ready terminal. Desktop 1440, native user-width 1280 and phone 390 captures show the actions inside the dialog; internal scrolling exposes both actions on smaller viewports. Evidence is recorded in .impeccable/review/action-*.jpg. Trusted automatic design detection found no issues; no new suppressions were added.

Fresh design disposition: ship for action placement, with all five contract sections returned and no material fixes. All six required captures were validated. The reviewer confirmed compact tile footers, actions grouped inside the details card and reachable scrolling/wrapping on smaller screens. The inherited homepage fidelity gate remains outside this correction's scope.
