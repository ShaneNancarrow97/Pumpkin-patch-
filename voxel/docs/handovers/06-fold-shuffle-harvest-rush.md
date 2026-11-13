# Follow-up for Claude: Fold framing, shuffle and harvest rush

Branch: `contractor/house-levels-midi`. This follows contractor commit `e95210b` and keeps the earlier delivery intact. Pull/review this branch; do not replace Claude's unpublished scene or fixture work wholesale.

## Completed changes

**Wider unfolded/fullscreen view.** The camera previously chose a 17-unit phone crop whenever the canvas was fractionally taller than wide. On an 874 × 787 Fold viewport, the navigation rail leaves a 786 × 787 canvas, triggering that close crop. `src/camera-layout.js` now smoothly widens the farm from 20 units on a phone to 46 units on an unfolded display. Rooms fit their full width with margins instead of applying the phone crop. Roof/fence pan limits are balanced vertically. Entering fullscreen fits the scene; unfolding releases a previously close zoom. A ResizeObserver handles canvas/layout changes, and Settings → Fit view restores the default. Pinch/scroll can zoom out further (farm 0.5×, rooms 0.6×).

**Music shuffle.** Shuffle defaults on, persists in preferences, and advances automatically at track endings. A shuffled bag plays every track per round without consecutive repeats, including between rounds. Settings has Shuffle and Next song controls. Manual song selection still works; switching shuffle off repeats the selected track. Muting or hiding the page still stops the player. Added the user's supplied Living Dead Girl MIDI intact; the menu now has nine offline tracks.

**Harvest rush.** Six manual harvest picks within the existing five-second streak window trigger 20 seconds of **50% higher visitor frequency** (arrival intervals divided by 1.5), alongside the existing £5 streak reward. The same 60-second reward cooldown prevents stacking or refreshing the rush. It applies to outdoor parties and indoor shopper arrivals, multiplies existing frequency upgrades, and rescales the current arrival timers at activation/expiry so the effect helps immediately. It does not increase party size, visitor budgets or shop capacity. Helpers do not generate manual harvest streaks. The existing small streak chip shows the visitor bonus and remaining time after the pick streak expires.

## Saves and integration

State schema is now **5**. New `streak.visitorBoostUntil` defaults to zero for old saves; valid remaining duration survives a new save/reload, capped to 20 seconds when restoring malformed values. Time is game time; tea break preserves the countdown. `model.update` now directly respects `s.paused`, including the test/debug advance helper. Level reward migration still accepts v4 progression data.

Main integration files: `scene.js`, `main.js`, `model.js`, `rules/farm.js`, `rules/selling.js`, `ui/audio.js`, `ui/settings-sheet.js`. New small helpers: `camera-layout.js` and `ui/music-queue.js`. No new buildings or fixture files were touched. Farm expansion/crafting/chef drafts remain unintegrated.

## Verification and building

58 Node tests passed after these changes, including actual MIDI-player end-of-song transitions under a controlled audio clock, shuffle uniqueness/repeat/mute, camera sizing around the Fold breakpoint, rush activation/cooldown/expiry/timer adjustments, pause and save migration. New portable browser script: `tools/qa-fold-view.mjs`. It checks framing, fullscreen, Living Dead Girl, shuffle controls and captures viewport screenshots. The screenshot run was still in progress when this push was requested; do not describe its full result as passed without checking its report.

```sh
cd voxel
npm test
node build.mjs --out /path/to/Pumpkin-Patch-Fold-Wide-View.html
CHROMIUM_PATH=/path/to/chromium node tools/qa-fold-view.mjs --html /path/to/Pumpkin-Patch-Fold-Wide-View.html --shots /path/to/qa
```

The current user-facing artifact is `Pumpkin Patch - Fold Wide View.html`. Build output remains outside Git; all source, MIDI, tests and handover changes are on the contractor branch. Fold sizes are browser emulation, not a physical handset certification.
