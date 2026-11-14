# Village graphics settings

This pass starts from `ce9183589acd4940f0aead8d2b8703cb86208c75` on `contractor/village-settings`. It adds a village settings gear and one compact page for renderer, post effects, shadows, render distance and grass quality. Settings apply live and save automatically. The farm keeps its own graphics choices. Save version remains **20**; progression, economy, quests and artwork are unchanged.

Runtime `7be8eed82e04bb1c8d891a3aa6a0bf1cc9948cdf` is built and verified below. Publication receipts are added after immutable download verification. Read the preceding [frame-budget handover](../village-frame-budget/README.md) and [renderer ownership handover](../village-webgpu/README.md) before extending the rendering paths.

## Player controls and preferences

The gear sits beside the village's character and fullscreen buttons. The controller navigation hub also has a Village settings entry. All five choices and Restore defaults stay on the same page, using the existing plum/gilt drawer and HTML controls. Opening the page releases held movement and gathering; closing returns to the existing navigation/focus flow. Changes preserve the selected control and scroll position. Asynchronous renderer status only updates its status text, so an open native select is not replaced during WebGPU startup.

| Preference | Choices | Fresh-device default |
| --- | --- | --- |
| `villageRenderer` | `auto` (Automatic), `webgpu`, `webgl` | `auto` |
| `villagePost` | `off`, `low` (Subtle), `balanced`, `high` (Rich) | `balanced` |
| `villageShadows` | Boolean; On/Off in the menu | `true` |
| `villageDistance` | `near`, `balanced`, `far` | `far` |
| `villageGrass` | `off`, `low`, `balanced`, `high` | `high` |

`src/village-graphics.js` is the shared whitelist/default source. Older preferences without village overrides inherit `glow: false` as village post Off and `shadows: false` as village shadows Off. Explicit valid village values win. Restore defaults resets only these five village fields, including shadows On, without resetting farm, audio or controller preferences.

These are device preferences in `pumpkin-patch-voxel-reference-v1-prefs`, separate from saved gameplay. A save-file export records them in the existing `prefs` envelope; the current import/undo flow restores farm state and deliberately retains the receiving device's local preferences. It does not apply the exported graphics values. No save migration or envelope change is required. A valid `?villageRenderer=auto|webgpu|webgl` overrides the initial in-memory choice for QA/browser use; subsequent menu changes win for that session. The URL is read again on reload. As part of the ordinary preference object, that initial choice can be recorded by a later preferences save or export.

## Rendering and ownership

**Renderer changes.** Automatic and WebGPU both attempt genuine WebGPU and retain WebGL if the API, adapter, initialisation or device fails. The UI names the renderer actually in use. Selecting WebGL immediately conceals/removes the GPU overlay and retires its owned pipeline/device. Auto ↔ WebGPU reuses a healthy pipeline or its current startup. A failed choice does not retry every frame; selecting another renderer is an explicit retry path.

Each startup attempt owns its overlay, pipeline and generation token. Late factory results, first-frame completions and device callbacks can only release their own attempt. A cancelled asynchronous startup drains before another begins: Three r169's post-processing fullscreen material is module-global, so an old disposal must not reset a newer graph. The original WebGL scene, geometry, textures, simulation and HTML UI remain their existing owners. The GPU canvas appears only after a completed current frame; the game's existing paced frame loop remains authoritative.

**Post effects.** Balanced preserves the authored village bloom and grade. Subtle scales bloom by 0.45 and grading by 0.5; Rich scales them by 1.25 and 1.15 respectively. These are intensity choices, not fewer-pass quality tiers. **Off bypasses the post-processing path** on both renderers and removes its bloom/grade work. Both backends share the same neutral-to-authored grade calculation, retain one ACES/sRGB output conversion, and leave `scene.userData.bloom`/`grade` untouched. Existing TV/resolution/antialiasing policies remain in charge of their own budgets.

**Shadows and farm isolation.** The shared WebGL renderer adopts the village shadow setting while the village is active, then restores the farm's setting on return. A real shadow-mode change dirties materials and requests fresh shadows when enabling; it does not do that work every tick. WebGPU receives the village preference through its existing shadow budget, including first-use, re-enable, resize, context-change and accepted-frame cadence rules. Village post settings never overwrite the farm's `glow` preference.

## Distance, grass and map contracts

Render distance controls outdoor chunk reach and its matching fog, not movement, interaction reach, resource placement or the camera's far plane. Near/Balanced/Far use **150/200/250 world units in follow play** and **240/320/400 in the overview**. Far is the previous policy. Lower settings thicken fog before shortening visible chunk range; increasing the setting reveals additional chunks through the existing fog before it clears. District haze multipliers still apply. Tours temporarily use the full Far framing without changing the requested preference. Interiors and caves retain their enclosed visibility/fog policy.

Grass uses existing scattered instance buffers and three bounded geometry wrappers. High retains 100% of tufts with up to five blades; Balanced uses 72% with up to three; Low uses 45% with one blade and no flowers. Distance fading can lower detail further. Off hides all grass/flowers and skips their update work while retaining the ground texture. Changes invalidate stationary selection once, reuse the existing instance data, and restore the correct current view when returning from a hidden interior. The GPU mirror copies source instance counts and geometry draw ranges.

Native verification exposed a transition bug at the grass fade boundaries: a temporary quality cap or Off setting overwrote the distance hysteresis, so returning to High at the same camera position could retain fewer blades, flowers or patches. Distance detail and range visibility now have their own state, separate from the selected quality and submitted mesh visibility. The regression in `test/village-world-settings.test.mjs` cycles Low → Balanced → Off → High at the 53, 79 and 106 world-unit boundary bands, checking exact restoration of counts, geometry, visibility and work statistics without moving the camera.

The structural map photograph remains complete and independent of these settings. Its capture temporarily owns all surface visibility, hides grass, removes fog and restores the borrowed scene in `finally`. The distance helper yields while fog is absent. Graphics changes do not invalidate the structural snapshot signature or introduce a second map renderer.

## Dependency matrix

| Change / owner | Depends on | Preserve when extending |
| --- | --- | --- |
| Preference schema — `src/village-graphics.js`, `main.js` | Shared enum whitelist; existing local `-prefs` store | Migrate missing overrides from old glow/shadow values; do not add these fields to gameplay state or silently apply imported device settings |
| Settings page — `src/ui/village-settings.js`, `.css`, `village-game.js` | Existing drawer/history, semantic control IDs, HTML selects, controller navigation | Keep all choices reachable; release world input on opening; preserve focus/scroll; patch status text without replacing open controls |
| Stylesheet delivery — `build.mjs` | Existing village tokens, TV zoom and responsive header | Inline the settings CSS in the full game; keep balance, character, fullscreen and gear reachable on narrow screens |
| Runtime integration — `src/scene.js` | Active `view.place`, authored bloom/grade, farm bloom/shadow flags | Apply village preferences only in the village; restore shared WebGL shadow mode on exit and invalidate materials only when it changes |
| Renderer selection — `src/rendering/village-renderer.js` | Attempt generation/owner, pending startup, completed-frame reveal | Stale callbacks must never release a successor; drain cancelled startup before replacement; no per-frame retry after fallback |
| GPU lifetime — `village-webgpu-pipeline.js` | Owned device/overlay/wrappers; borrowed source scene; r169 shared post material | Retire owned resources once; never dispose source assets or overlap old post disposal with new graph creation |
| Post profiles — shared helper and both renderers | Authored grade, one ACES/sRGB transform, existing AA/TV sizing | Subtle/Rich change intensity; Off bypasses passes; do not mutate the authored grade or double-apply output conversion |
| Shadow preference — `scene.js`, existing GPU shadow budget | Active place; accepted GPU frames and exceptional invalidations | Preserve farm choice, first-use/re-enable refresh and cadence; do not treat source ticks as accepted frames |
| Distance — `village-graphics-distance.js`, `village-view.js` | Current fog, district haze, chunk bounds, following/tour/enclosed context | Cull behind fog; leave camera lens, walking and interaction rules intact; tours do not overwrite the saved choice |
| Grass — `village-grass.js`, GPU mirror | Existing instance order/buffers, LOD wrappers, proximity fade, hidden ancestors | Keep distance hysteresis separate from quality caps and mesh visibility; change counts/draw range without rebaking; invalidate stationary selection after quality edits; do not unhide an enclosing interior |
| Map photograph — existing `withMapSurface` / `village-map-snapshot.js` | Borrowed visibility/fog/light state and restoration in `finally` | Full structural coverage at every quality; no culling while the map owns the scene; restore live visibility after capture |
| Diagnostics and QA | `scene.villageGraphicsStatus`, renderer/world stats, exact HTML | Separate selected preference from actual backend/effective tour reach; report work counters without presenting them as physical-device FPS |

## Verification and release

The exact HTML is **61,832,139 bytes**, SHA-256 `43057ebb2980cf22982859fd08f6ffa0e87a651baa9781504db1eaf2aa0a1ed4`, built from runtime `7be8eed82e04bb1c8d891a3aa6a0bf1cc9948cdf`. An independent rebuild is byte-identical. Later commits only record QA and delivery evidence.

| Evidence | Result |
| --- | --- |
| Complete automated suite | **1,602 passed**, zero failed, skipped or cancelled; `verification/full-tests.json` and compressed complete log |
| Village UI/controller acceptance | **16 checks passed**; desktop 1280×800, phone 390×844, landscape 844×390 and real TV mode 1920×1080; touch targets, readable text, header fit, controller selection/back, held movement, reload and reset |
| Native WebGL settings phase | **11 completed checks passed** on this exact HTML: real glow strength, post/shadow disabling, actual grass work/restoration, distance fog/culling and map preservation; `verification/native-webgl-phase.json` |
| Native WebGPU continuation | **17 checks passed** on this exact HTML: explicit live startup, completed GPU frames and actual canvas pixels, optional effects Off/On, Auto reuse, one overlay, WebGL return and original farm shadow/glow restoration |
| Compatibility smoke | **54 checks passed** on desktop and phone; complete compressed log retained |
| Build/package integrity | Independent HTML builds match; ZIP CRC passes and its contained HTML matches the same SHA-256 |

The first native run exposed grass hysteresis loss when returning from Low/Off to High; the runtime fix and boundary regression are described above. Its pre-fix report is retained separately. The final artifact completed all 11 WebGL checks before a later GPU assertion incorrectly expected one renderer call. Three r169 correctly uses **two** with optional effects Off: scene drawing plus its required ACES/sRGB conversion. The engine was already behaving correctly; the QA assertion was corrected and the GPU portion rerun on the unchanged HTML. The original counter-review report is retained in `verification/native-transition-counter-review.json.gz`. The corrected run measured **2 calls with effects Off versus 15 with Balanced**, zero unsupported materials and no page/shader/loading errors. These counters are not device FPS measurements.

The UI-only harness holds draws after native startup for layout/controller checks; its screenshots demonstrate the interface, not live rendering or frame rate. Native runs use the real game RAF without manual ticks/renders, at a **480×270 buffer** to bound software GPU cost. Their actual WebGPU canvas captures are separate from the page compositor. Gamepad API injection verifies navigation logic, not physical Bluetooth pairing; physical phone/TV FPS is not certified. No new APK is prepared by this pass.

Commands:

```sh
node --test --test-concurrency=2 'test/**/*.test.mjs'
node tools/village-settings-qa.mjs EXACT.html OUT --ui
node tools/village-settings-qa.mjs EXACT.html OUT --native --gpu
# Targeted GPU continuation after a completed WebGL phase:
node tools/village-settings-qa.mjs EXACT.html OUT --native --gpu --gpu-only
MOTHLIGHT_EXPECTED_SHA=43057ebb2980cf22982859fd08f6ffa0e87a651baa9781504db1eaf2aa0a1ed4 node tools/mothlight-standard-smoke.mjs EXACT.html
```

Read `release.json` for machine-readable receipts and `verification/` for reports and captures. The source stays on an isolated contractor branch above `contractor/village-frame-budget`; Claude's lead checkout is untouched. The last remote check found `voxel-reference` at `8da66cb93893047d56bad874583f509ba0209d7a` and the base at `ce9183589acd4940f0aead8d2b8703cb86208c75`.

DOWNLOAD_LINKS_PENDING
