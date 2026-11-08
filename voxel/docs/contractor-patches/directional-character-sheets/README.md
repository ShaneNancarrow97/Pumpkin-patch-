# Directional character sheets — contractor handover

This patch replaces one-view walking for the Mothlight cast and three-view walking for the owners' everyday looks with painted directional locomotion. The renderer selects the body's viewing angle from actual travel relative to the active camera. Walk progress follows distance travelled, so a blocked character stops stepping and a turn does not restart the cycle.

## Integration

Work branch: `contractor/directional-character-sheets`.

Parent: `8901e18df05367d7ce38f3e0da775d07ce877a21` on `contractor/mothlight-living-village`. This is an incremental contractor patch on the delivered Living Mothlight update. It is **not** an independent replacement for Claude's current `voxel-reference` branch. Bring the parent contractor work in first, or review the dependency matrix before transplanting the adapters.

Claude's lead branch was checked before work; its recorded head was `604fe2359427fc7e90a3d1248a6c4d1d6b0136c8`. No lead checkout or uncommitted work was edited. A release receipt records the final source and download commits.

## Delivered scope

The runtime manifest in `assets/directional/manifest.json` is authoritative. The pack covers Shane and Natalie in their everyday clothes, plus Elowen, Rowan, Vesper, Mabel, Tansy, Opal, Cinder, Corvus and Baron. Each has 64 drawings: eight viewing directions with eight successive movement phases. Cinder floats and remains legless.

These are eight hand-painted viewing sectors, not calibrated 15-degree renders. The pack does not claim new directional costumes, pet movement, seated poses, watering, planting or picking. Original idle, greeting, tool and costume art is retained where the new manifest has no matching action. Never substitute an owner's everyday atlas for an equipped costume.

## Runtime changes

- Shared direction selection is in `directional-sprite-math.js`. A camera rotation changes the viewed row without changing the character's world heading or gait progress.
- Owners use the new art in direct control on the farm, in rooms and in the village. Autonomous farm and house walking passes actual travel to the same adapter.
- Village neighbours retain their existing routes and conversations, using the new direction rows when they walk.
- Optional atlases decode on demand and are shared between actors. The original art remains available while a new sheet loads, and on a load failure.
- Room cleanup releases each painted actor's private materials without disposing the shared frame geometry. This also fixes a pre-existing cache-lifetime problem exposed by repeated room changes.
- No save schema, economy, quest rewards, visitor rate, controller binding or level gate changes are included.

## Art workflow

Approved source paintings and provenance are in `assets/directional-sprite-concepts/`. Several front cycles needed targeted corrections after repeated leading feet were spotted. Their original direction sheets and accepted repair strips are retained with reproducible assembly scripts. Rejected alternatives are listed in provenance and never used by the runtime. The source manifest records source cuts and measured pivots; the baker does not redraw, mirror or manufacture frames.

```sh
python3 tools/bake-directional-sprites.py
npm test
npm run build
node tools/build-directional-preview.mjs
CHROMIUM_PATH=/usr/bin/chromium node tools/directional-game-qa.mjs dist/pumpkin-patch-voxel.html
```

`assets/directional/preview.html` provides direction selection, slow playback and frame scrubbing for every delivered sheet. Contact sheets show all 64 cells with their intended phase labels. Source PNGs are review assets; the game imports only the measured WebP atlases and generated metadata.

The preview builder makes a separate self-contained animation reviewer with the WebP and contact sheets embedded. It does not require a local server. The full game remains the normal `dist/pumpkin-patch-voxel.html`; the review page is not a replacement game.

Visual review confirms distinct body views and repaired opposite front contacts/passing poses. Capes, skirts and coats obscure parts of the side/rear gait. These are hand-painted cycles, with small differences in face and cloth details between independently painted views; they are not a rig-certified animation library. Review those obscured transitions before using the art for very close cinematic views.

Runtime cells are 128 × 176, with a shared root `(64,164)` and one uniform scale per character. The measured body height determines world scale. Each RGBA sheet is about 5.5 MiB decoded, independent of its compressed WebP size. Do not increase resolution or expand every costume without rechecking mobile texture memory.

## Next art batches

1. Matching eight-direction standing poses, then directional tools with measured hand anchors.
2. Costume batches, preserving each owner's body scale and the equipped look. Include wheelchair-specific wheel and arm cycles rather than a walking gait.
3. Visitors and pets, with species-appropriate movement and correct proportions.
4. Consider 24 views at 15 degrees only after a memory/performance review. That is 192 walking drawings per look before actions, not a metadata toggle.

Read [COVERAGE.md](COVERAGE.md) for the exact art contract and [DEPENDENCIES.md](DEPENDENCIES.md) for integration risks. Verification receipts and screenshots live in `verification/`; do not treat synthetic atlas tests alone as visual approval.
