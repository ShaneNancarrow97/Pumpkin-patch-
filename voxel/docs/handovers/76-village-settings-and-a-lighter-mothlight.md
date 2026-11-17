# 76 — Settings in the village, a renderer selector, and a lighter Mothlight

This round brings Codex's last 113 commits onto `voxel-reference` and builds on them. Read Codex's own
handovers for what came in (they live in `docs/contractor-patches/`, newest first in `AGENTS.md`), then this.

## 1. What came in from Codex (fast-forwarded, unchanged)

`contractor/village-settings` stacked every Codex branch since handover 75, so `voxel-reference` was
fast-forwarded to it (`da065a0`) after checking it: all 1,602 tests passed, the build was byte-identical to
Codex's published HTML (SHA-256 `43057ebb…`), and the smoke test passed 54 of 54. In short:

- **village-clarity / village-atmosphere / village-fidelity:** a map drawn from the village itself, guided
  walks, gardens and commons between the landmarks, district night palettes, Granny's cottage and the Baron's
  manor finished, a painted dusk sky, story/journal polish.
- **village-webgpu:** a real WebGPU presentation of the village (TSL materials, PBR atlases, baked voxel AO),
  with a safe WebGL fallback. WebGPU draws on its own canvas over the WebGL one.
- **village-ui-couture, farm-village-bonds, village-recovery, village-detail-polish, village-frame-budget:**
  menu and dialogue polish, shared keepsakes, walking fixes, cheaper per-frame work (lamp selection, grass
  selection, mirror upkeep, shadow pacing), earned village outfits.
- **village-settings:** the first village settings page: renderer, post effects, shadows, render distance,
  grass.

## 2. Settings, whenever you're in the village

The gear in the village header (and the Settings card in the Options hub) opens **Settings** with four tabs.
L1/R1 turn the tabs on a pad; ←/→ on a focused tab does the same on a keyboard.

| Tab | What's in it |
| --- | --- |
| **Graphics** | The **renderer selector** (Automatic / WebGPU / WebGL as three big buttons, with the renderer actually on screen, the graphics chip's name where the browser shares it, frames a second and the drawn size); **Quick setup** (Smooth / Balanced / Beautiful); Resolution; Frame rate; Post effects; Shadows; **Shadow detail**; Render distance; Grass; **Atmosphere**; Restore defaults |
| **Game** | Tea break; **Motion** (Match device / Reduced / Full); TV mode and TV menu size; Save to a file |
| **Sound** | Music on/off, volume, track, shuffle, next song; sound effects; voice narration, volume and a preview |
| **Controls** | What every button, key and gesture does in Mothlight (controller, keyboard and mouse, touch) |

- Quick setup's **Balanced** is exactly the defaults ("the village as made"); **Smooth** = Automatic
  resolution, subtle effects, soft shadows, balanced distance, low grass, light atmosphere; **Beautiful** =
  Sharp, rich effects, sharp shadows, far distance, high grass, full atmosphere. Any later change makes it your
  own mix (no preset lit).
- Resolution and frame rate are the farm's own choices, shared (the farm's Settings shows the same). Graphics
  choices otherwise apply only in the village, as Codex built them.
- Files: `src/ui/village-settings.js` (markup, binding, the presets, the live line), `.css`;
  `village-game.js` (`settingsTab`, `settingsSignatureNow`, the handlers); `main.js`
  (`villageSettingsHost`: game and sound choices go through the farm's own audio, narration, TV and save-file
  handlers, so there is one source of truth). Every control has a stable id (`vg-renderer-*`, `vg-preset-*`,
  `vg-setting-*`, `vg-pref-*`, `vg-toggle-*`, `vg-range-*`, `vg-action-*`, `vg-settings-tab-*`), which is what
  keeps focus in place when the panel redraws.
- The panel redraws only when a shown choice changes; the renderer status and the live line are patched in
  place every 0.8 s (`updateVillageSettingsStatus`), so an open dropdown or a dragged slider is never replaced.

### New preferences (device preferences, not the save)

| Key | Values | Default | Notes |
| --- | --- | --- | --- |
| `renderQuality` | `auto`, `sharp`, `balanced`, `performance` | `auto` | **Automatic is new and the default.** Devices on the old default Sharp move to Automatic once (`detailVersion: 1`); any later choice is kept. QA harnesses that need fixed pixels should set `detailVersion: 1` with `renderQuality: "sharp"`. |
| `villageShadowDetail` | `auto`, `soft`, `sharp` | `auto` | The moon's shadow map: 1024² at Soft, 2048² at Sharp; Automatic = Soft on touch devices. Works on both renderers (WebGL drops its old map; the WebGPU mirror copies `mapSize` each sync). |
| `villageAtmosphere` | `full`, `light`, `off` | `full` | Moths, motes, fireflies and moonbeams. Light = the TV budget; Off hides and stops them. |
| `reduceMotion` | `auto`, `reduced`, `full` | `auto` | Overrides the device's reduce-motion setting for the village (and the farm's room glide). `src/motion-preference.js`. |

`normaliseVillageGraphics` now also normalises the two new village keys; saves stay version 20.

## 3. A lighter Mothlight

### Arriving in the village: 64% less work

The first visit each session built the whole village synchronously before anything drew. Measured in the
container on the same fixture (software rendering, so the absolute numbers are slow, but the ratio holds):

| | Before | After |
| --- | --- | --- |
| Building the village (`openVillage`) | 11.3–12.0 s | 4.2 s |
| To the fourth drawn frame | 19.6–20.9 s | 11.6–12.6 s |

- **Ground texture** (4.5 s → 0.5 s): its canvas is created with `willReadFrequently`, so the read-back of
  1528×1024 pixels is a memory copy, not a trip to the graphics card.
- **Grass placement** (4.3 s → 1.0 s): `inVillageNeighbourhood` was a full scan of every garden, path and
  solid (copying each path's points) for every candidate tuft. A frozen cluster list now gets a 6-unit grid of
  the clusters each cell could touch. Identical answers: `test/village-neighbourhood-index.test.mjs` compares
  it with the old scan at ~720,000 points.
- **`isWater`** is 11× faster: it tested the Marsh causeway (copying an array) before asking whether the point
  was near water at all. Same answers at 3.6 million points (checked against the old function).
- **AO bake:** the occupancy lookup uses plain arrays and counted loops. Small gain; the bake (1.65 s here) is
  still the biggest remaining build cost.

### Every frame

- **Automatic resolution** (`src/dynamic-resolution.js`, `scene.js`): draws like Sharp, and steps the pixel
  ratio down (100 → 88 → 77 → 67 → 58%) while fewer frames reach the screen than the cap allows, then back up
  once the cap is held. It counts frames that are *shown*: WebGL's drawn frames, or WebGPU's completed ones
  (WebGPU skips submissions rather than slowing the loop, so drawn frames would hide a slow GPU). It never
  lowers detail when the game's own work is what's late, or while a menu is open or the tab is hidden; a raise
  that falls straight back makes it wait longer. The village and everywhere else keep separate levels. A cast
  (TV mode) is never drawn below a pixel a CSS pixel. `scene.detailStatus` reports it.
- **Soft shadows on phones:** a quarter of the shadow pixels (1024² instead of 2048²) wherever the moon's map
  is redrawn, unless the player picks Sharp.
- **Atmosphere Off/Light** removes or trims the moths, motes, fireflies and moonbeam cards.
- **WebGL warm-up:** entering the village (or falling back from WebGPU) compiles every village shader with
  `compileAsync` and queues the village's textures for upload one a frame, so going indoors or round a corner
  stops less often for a new material. It is skipped while WebGPU will draw the village.

## 4. Checks

- `npm test`: **1,612 passed** (10 new: Automatic resolution, sizing, the new preferences, the settings tabs and
  controls, the neighbourhood index).
- Smoke: **54 of 54**.
- Browser, this build: every tab at 1280×800, 390×844 (touch, DPR 2) and 1920×1080 in TV mode — no overflow, no
  target under 44 px, no page errors. A pretend DualSense: Options → Settings card → ✕ opens on the renderer in
  use; R1/L1 turn tabs; ✕ toggles the tea break and keeps focus; D-pad right raises the music volume and saves
  it; ✕ on Smooth applies soft shadows, light atmosphere and low grass live; ○ backs out (10 of 10).
- WebGPU (SwiftShader Vulkan): the village comes up on WebGPU, the live line names the adapter, Automatic counts
  completed GPU frames, shadow detail and Atmosphere Off apply on the GPU path, and WebGL ↔ Automatic switching
  works, with no errors.

## 5. Next, for Codex

1. **Arrival shaders.** After the build, the first village frame still compiles ~40 programs (the shadow pass's
   depth programs among them). Where `KHR_parallel_shader_compile` exists, `compileAsync` before the first
   village draw behind a short "Arriving in Mothlight…" veil would turn the stall into a wait the page survives.
2. **AO bake** (the largest build cost left): bake per chunk across idle frames, or cache the packed words.
3. **Repository size.** `docs/contractor-patches/` is over 230 MB of verification PNGs and logs. Please keep
   screenshots and logs in the PR or a release artefact, not the branch, from now on.
4. Tell Claude if a phone/TV run shows Automatic resolution hunting (stepping up and down); the thresholds are in
   `dynamic-resolution.js` (`SLOW`, `ROOMY`, `COOLDOWN`).
