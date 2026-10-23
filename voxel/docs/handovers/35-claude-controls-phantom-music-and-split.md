# 35 — Claude: decorating controls, the animated phantom, zoom, music, and what Codex can pick up

For Codex. Follows handover 34. Base your next branch on the head of `voxel-reference` (`c99c7e9` or later).

## What changed since 34

**Farm zoom and crisp sprites** (`camera-layout.js`, `crisp-sprites.js`, `scene.js`)
- The farm zooms to `cameraLayout().maxZoom` (4.5×).
- Sprite materials go through `crispen()`, which samples one mip level finer, and sheet textures through `crispTexture()`. Use both for any new sprite art.
- FXAA is skipped at 1.75 device pixels per CSS pixel and above. `renderStatus.antialias` then reads `"density"`; the two QA scripts expect that.

**Foyer and garden decorating** (`piece-gestures.js`, `ui/foyer-controls.js`, `ui/estate-controls.js`)
- `attachPieceGestures` claims one-finger drags on the selected piece, and two-finger turns, in the capture phase, before OrbitControls sees them.
- Both editors have the same gesture API: `beginGesture`, `dragTo`, `turn` and `endGesture`. A gesture is live, keeps the last spot that fits and saves on release.
- The cards have the house's rotation dial, and moves snap to 0.1.
- `createFraming` eases the camera so a newly picked piece clears the card.
- Tapping the already-selected piece no longer reverts its moves.
- `scene.project(x, y, z)` gives a world point's place on the canvas, for browser tests.

**The phantom finale** (`maze-effects.js`)
- It is jointed: the robe carries the hood, two arms and the hem as child objects.
- New motions are `phantom-body`, `phantom-head`, `phantom-arm` and `phantom-hem`; the eyes and chest glow pulse through the glow material's colour.
- Reduced motion holds it still, and it stays within the prefab test's limits (122 boxes, 8 batches).

**Music:** 16 tracks. New ones are Nothing Else Matters, (Don't Fear) The Reaper, Gypsys, Tramps & Thieves and Everybody (Backstreet's Back). `test/midi.test.mjs` counts the files.

## The split from here

Claude is doing these next; please leave the files alone until the next handover:
- the Hollow House's exterior on the farm (`buildHollowExterior`, `hollow-house-farm.js`);
- the hayride site in the woodland clearing (shared layout data, as handover 33 proposed).

Codex, these are yours if you'd like them. Each is a `contractor/*` branch off `voxel-reference`.
1. **The twelve house furnishings** from handover 31 as native voxel models. Measure them with `tools/measure-decor.mjs` and add them to the house catalogue.
2. **The six wallpapers** from handover 31 as tested repeat panels in the rooms.
3. **Smoke coverage.** Rerun `npm run smoke`, which last passed at `f2afa6b`, and fix anything this round broke. Then extend it to cover:
   - a foyer drag and dial turn, using `scene.project` to find the piece;
   - a garden drag;
   - the walkthrough's finish card.
4. **The hayride's operational slice** (handover 32, step 2), once Claude's site handover lands. Please don't start on world coordinates before then.

## Verification at `c99c7e9`

- `npm test`: 267 pass.
- `tools/qa-maze-ride.mjs`: 71 pass at `acc10e9`. The changes since then are the decorating controls, the phantom, the zoom and the music.
- Browser checks covered:
  - mouse and touch drags in the foyer and garden;
  - farm zoom at 1×, 2.6× and 4.5× on desktop and phone;
  - the phantom across four animation frames.
