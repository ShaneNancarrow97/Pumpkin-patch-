# Contractor follow-up: haunted house and rendering cost

Branch: `contractor/haunted-house-estate`. Preserve Claude's lead branch and saves.

User reports the haunted house freezes and general gameplay lags, on the downloadable build. The complete device freeze has not yet been reproduced locally; do not claim the following simulation fix alone explains that symptom.

## Changes

- Closed Hollow House: unpaid reception visitors previously re-entered the close handler in their `exit` phase every tick. Their elapsed timer was reset before it could advance. Exclude that phase from cancellation so they finish leaving, with no ticket charged. Regression covers eventual return to the shop using the same purse.
- Touch devices (including foldables regardless of viewport width) cap world DPR at 1.5 rather than 2. Mobile moon shadows use 1024 rather than 2048. Desktop retains its world/shadow resolution.
- Postprocessing runs at logical-pixel resolution rather than multiplying bloom/composer buffers by device DPR. Lighting and glow remain enabled according to existing preferences. This reduces fill and render-target memory, without changing geometry, simulation speed, economy or saves.
- `PumpkinVoxel.scene.renderStatus` provides read-only render resolution, draw/triangle and memory counters for real-device troubleshooting. Software Chromium is not a Fold hardware benchmark.

## Review

Full Node suite: 29 test files pass, including the added closed-attraction exit regression. Browser QA: all 26 Hollow House checks pass, covering entry, live ticket accounting, visitor selection, placement, all tiers, mobile layouts, save/reload and a final Fold capture with bloom/shadows enabled. No console or page errors. Existing saved decorations, purchases and progression are untouched. No schema change.

If a device still freezes, distinguish building selection from Enter, check whether disabling glow in Settings prevents it, and inspect browser/context errors. Local browser success cannot rule out device GPU/context pressure.
