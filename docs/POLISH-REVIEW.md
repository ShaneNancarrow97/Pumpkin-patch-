> **Note (added when importing to GitHub):** written against Midnight 2.2. Links to `dist/` files and images refer to the original project and are not in this repository.

# Midnight 2.2 — polish review

Reviewed 13 October 2026 against `8095419` (Midnight 2.1). The changes in this release improve the existing game; they retain its artwork, purchases, save key, and core economy.

## Findings and shipped fixes

| Priority | What a player encounters | Reproduction / evidence | Resolution in 2.2 |
| --- | --- | --- | --- |
| P1 | A save can fail without a visible explanation. Downloaded HTML also lacks a way to move progress between browsers or file locations. | Make `localStorage.setItem` throw and save. The old status text changes inside an element hidden by the full-screen layout. There were no export/import controls. | Visible backup warning; Settings reports save health; downloadable JSON backups; validated import preview with cancel; undo the last import. Downloading a backup also works when browser storage is unavailable. |
| P1 | Damaged optional save fields can break automation or visitor rendering even when coins and purchases are valid. | Load an otherwise valid save with `autoTimer="broken"`, `nextVisitor="oops"`, or unknown achievement IDs. The old loader spreads these fields into the running simulation. | A dedicated decoder copies validated fields, normalizes timers and visitor counters, and filters achievement IDs. Invalid backup files fail explicitly and leave the current patch untouched. |
| P2 | Decorating requires travelling through a long page and a newly placed item may appear far above the current view. | Home → scroll through the 50-item store → Place. The old handler redraws the room without returning to it. | Separate Room and Decor shop tabs, remembered panel scroll positions, fit/closer room views, and automatic room reveal after placing an item or shelving a book. |
| P2 | Furniture can extend outside the room when dragged to its edges. | The 230-unit-wide starter chair could be centred at x=80, putting 35 units beyond the left edge. | Movement and save restoration account for each sprite's actual width and height. Every placeable item is checked at all four extreme drag positions. |
| P2 | It is difficult to distinguish affordable items, owned pieces, and the amount still needed. | Browse the cupboard with £30. The old list has category/search/collection filtering, but no budget filter or sorting, and unaffordable buttons give no shortfall. | Live budget filter, price and haunting-point sorting, ownership badges, point values, exact coin shortfalls, and a useful empty state with a clear-filter action. |
| P2 | Some frequent buttons are smaller than the intended mobile target size. | Source review found top tools at 38 × 40 and a 38-high close button. Small room decorations shrink further in a fitted view. | Top tools, close controls and settings actions use 44-unit minimum targets. Furniture keeps its art proportions and receives a transparent minimum touch area; closer view and move arrows remain available. |
| P3 | The Journal dot implies there is something to collect even when no rewards are ready. | Start a fresh patch; the old dot is always visible. | It appears only for claimable favours, with an accessible reward count. Plant all and Harvest all now show actionable quantities. |
| P3 | Keyboard selection in a sort menu could also trigger farm shortcuts. Menus share a generic accessible name. | Farm shortcuts previously excluded inputs and textareas, but not selects. | Selects are excluded from shortcuts; menus use their current heading as their accessible name. |

Implementation: [house UI](../dist/house-ui.js), [house placement rules](../dist/house-model.mjs), [save validation](../dist/model.mjs), [backup format](../dist/save-model.mjs), [backup menus](../dist/save-ui.js), and [shared styling](../dist/style.css).

## Open findings

### P1 — real-device release checks remain open

Follow-up, 14 October 2026: the 2.3 foundation release can launch Chrome with the necessary sandbox permissions. Its exact standalone HTML passes real-browser flows at desktop, phone, small-phone, tablet and landscape sizes through an intercepted HTTPS origin; see the [browser report](FOUNDATION-BROWSER-REPORT.json). Managed Chrome rejects direct `file://` navigation with `ERR_BLOCKED_BY_ADMINISTRATOR`. Direct-file and physical Safari/Android checks therefore remain open. The launch restriction described below was the limitation during the original 2.2 review.

Chromium launch was attempted against the downloaded HTML and failed before loading the page with `setsockopt: Operation not permitted` from the sandbox. This prevents real-browser screenshots, CSS layout assertions, touch scrolling verification, and testing Safari's actual download/audio behaviour here.

The automated DOM harness verifies handlers and state but does not calculate layout, enforce browser hit testing, or reproduce mobile media restrictions. Native Canvas previews verify the artwork and rendered world, not the DOM interface. This build should not be described as physically tested on Safari or Chrome.

Required device pass: iPhone Safari and Android Chrome, portrait and landscape, plus desktop Chrome; open the actual downloaded file, not just a served page. Exercise every tab, scrolling/zoom, a purchase and placement, music after a gesture, rotation, save failure, backup export/import/cancel/undo, background/resume, and a reload.

### P1 — late-game production greatly exceeds sales

A deterministic ten-minute simulation with maximum farm upgrades and twelve Starlight plots produced **5,328 pumpkins**, sold **167**, and left **5,161 in stock**. It earned £11,690. The test starts from an empty farm and advances in 0.1-second steps, with no manual clicking or reward claims.

Reproduce with `npm run review:balance`.

This is evidence of an end-game throughput mismatch, not a measured new-player retention issue. Bulk purchases, visitor requests, and additional uses for stored pumpkins should be balanced together with upgrade costs and longer-term goals. Increasing sales alone would make the existing house and shop progression much shorter.

### P2 — progression ends too abruptly

The current game has four house stages, six paid costumes, fifty decor items, and ten finite favours. Once collected, the farming loop has few new decisions. Repeatable orders and meaningful house/farm milestones should precede another large cosmetic catalogue.

### P2 — maintainability needs a measured cleanup

The stylesheet retains successive layout overrides, and the classic offline bundle shares module-level names. This allows a simple, dependency-free download, but raises the risk of accidental cascade and initialization regressions. Consolidate one tested UI surface at a time once a browser screenshot baseline is available; avoid an engine rewrite as a polish task.

## Verification

- **44 model tests:** farming, buying, pause, house capacity, book ownership, costumes, per-plot pricing, favours, save migration, backup validation, and all furniture bounds.
- **Five offline UI suites:** the complete 50-item flow; startup and renderer-failure recovery; music/house/costume checks; shared top tabs; new home/store/backup flows.
- The new checks exercise storage failure, malformed imports, preview without mutation, cancellation, import, undo, and reload. Existing purchases and collections survive.
- Exact offline HTML includes all runtime art, audio, font and logic; no runtime network dependency was added.
- Browser/physical-phone QA remains open as described above. Audio control logic is tested with a media mock; it is not an audible playback check.

Art evidence: [four map stages](review-map-stages.webp), [four interior stages](review-interiors.webp), [six costume crops](review-costumes.webp). These are native-render previews, not browser screenshots.
