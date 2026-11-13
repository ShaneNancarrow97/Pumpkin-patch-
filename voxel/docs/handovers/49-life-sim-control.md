# 49 — A more physical life on the patch

Contractor branch: `contractor/life-play`.
Base: completed home/play handover 48, `cb7515092474c41893e3f0c918df7e49ec23c0a0`.

This builds on the existing farm, twenty-level home progression and v14 saves. Claude remains the lead; the published lead checkout and unpublished work are not replaced. The increment concentrates on direct-play feel, readable owner animation, a genuine camera stick and everyday home interactions.

## Direct play

The left thumbstick moves the selected owner. Walk/jog uses smooth, time-based acceleration and stops cleanly. The right thumbstick rotates the farm camera around the owner, with bounded pitch, and adjusts the cutaway room view within its useful angles. Centre camera / R3 returns focus to the character. DualSense left/right sticks, L3 gait and R3 centre share the touch implementation. The normal tycoon view returns when direct play is left.

A camera that turns needs more than a changed yaw. Farm ground exposes its side faces, owner/visitor billboards follow the view, movement-facing is camera-relative, and the night backdrop is kept behind the player rather than becoming a wall in front of the farm. No new light pool or shadowed light is added. Mobile GPU/frame-rate measurements remain a separate hardware check.

## Tool work

`rules/life-actions.js` defines transient plant/water/pick/clean jobs. `life-activity.js` orchestrates them; it calls the existing rules only after receiving a once-only completion. Releasing a deliberate hold early cancels without planting, harvesting or spending. A short tap assists one complete use for accessibility. Continued holding can select a local suitable neighbour and walk there; it is not a remote harvest or teleport. Movement, menus, character changes and paused play cancel unfinished work.

Crop identity, phase, water cooldown and barn space are checked again before completion. A helper replacing a crop invalidates the old gesture. Water still adds the existing twelve percentage points with its twelve-second per-crop cooldown; this update does not increase yields or create bonus coins. The watering can is an actual voxel model in the hand, with a visible pour aimed at the crop being worked, rather than whichever target happens to be nearest later.

The action button shows context and progress without creating a permanent instruction panel. A selected tool remains visible on the wheel button. Advanced furniture controls stay available through Arrange / More controls.

## Home use

Real chairs and benches expose sitting sockets; stocked shelves offer their books; nearby pets can be greeted and react. Walking or Stand returns the owner to a valid standing position. Arranging furniture stands the owner up first so moving a chair cannot leave them floating. Book text remains the existing library content and cooking/wardrobe interactions retain their proven detailed menus.

The base owners receive generated sitting and reading poses edited from the approved character art. Petting uses the empty-handed kneeling art beside the actual companion: a pet is not painted into the owner sprite a second time. Other looks retain their selected textures and use the compatible pose path; a costume is never silently exchanged for the base outfit. Wheelchair seating remains seated in its own chair. Pet reactions are cosmetic and have no hidden currency/resource effect.

## Animation correction

The previous side sheets often repeated the same leading leg. This increment replaces them with four contact/passing phases for all 20 selectable looks. The wheelchair uses arm/wheel motion. Source-grid cuts follow the measured alpha valleys so shoes and hair are not clipped. Baked alpha stature stays within 3% of each target; hats extend above the common body and the wheelchair remains seated. Walking cadence follows distance travelled, including small analogue movements. The seven new runtime atlases total 1,639,880 bytes before HTML encoding. See the [art audit, animated preview and measurements](../plans/life-play/walk-art/README.md).

The empty-handed base water poses share one real voxel can and stream; costumes retain their existing stance with that prop. Front/back walking art is retained and normalised. This is a painted four-frame gait, not a rig or a complete new directional tool/pose set. Equipped atlases join the existing one-texture-per-frame GPU warm queue; unused costume atlases are not all uploaded on startup.

## Controls

| Input | Move | Camera | Use | Tools | Walk/jog | Centre |
| --- | --- | --- | --- | --- | --- | --- |
| Touch | MOVE stick | LOOK stick | Tap once / hold | Tools | Walk/Jog | Centre icon |
| Keyboard | WASD / arrows | IJKL | X / E / Space | Q / Tab | Shift | C |
| Standard DualSense | Left stick | Right stick | Cross / Square | Triangle | L3 | R3 |

Circle cancels work, closes the current menu or stands the owner up before leaving. D-pad navigates native menu controls; left/right adjusts focused selects and numeric inputs. Triggers / keyboard brackets zoom. Bluetooth pairing belongs to the operating system. The two touch sticks own independent pointer captures.

## Integration

Highest overlap: `main.js` (delayed completion and contextual routing), `player-control.js` (movement/poses/targets), `scene.js`/`world.js` (orbit/billboards/ground), `places.js`/`home-pets.js` (home sockets/reactions), `ui/play-controls.js`/CSS (two sticks and hold boundaries), and owner sprite preparation/rendering. State version remains 14: gesture jobs, camera state and poses are transient. Existing progression, stock, purchases, rooms, saves and root 2D game remain intact.

Use the delivered patch only after handover 48, or review the contractor branch on a clean branch. Do not reset a lead checkout or merge the artifact-only download branch. Large image-generation sources and screenshots stay on the source branch; the small patch includes runtime art and preparation tools. Fetch source art before regenerating.

```sh
git apply --check /path/to/life-play-from-cb75150.patch
git apply /path/to/life-play-from-cb75150.patch
npm --prefix voxel ci
npm --prefix voxel test
node voxel/build.mjs --out /tmp/life-play.html
```

## Verification

Runtime: `145a44a226cef1856082ddfc97125565c4288e77`.
HTML SHA-256: `51a39600e0032f7bd775f5088b70fb15af7862b645146e30522c9002ec4499c3`.

- 89 native test files pass. Final runtime CI passes both the root `check` and `voxel` jobs, including builds and desktop/phone smoke tests: [run 40767306119](https://github.com/ShaneNancarrow97/Pumpkin-patch-/actions/runs/40767306119).
- 31 full-flow browser checks pass, covering real input, delayed/cancelled transactions, once-only rewards, home use and responsive controls. This report's hash precedes the final sprite packing/stature corrections and equipped-atlas warm queue; it is intentionally distinct from the release hash.
- 12 focused checks pass on the exact downloadable HTML: simultaneous captured touches, independent thumb release, all 20 live equipped walks, final water/pet presentation, 270-degree orbit and phone/Fold radial layouts. Screenshots have also been reviewed: one physical can and pour, one actual companion, readable seating and clear controls.

Reports and their scopes live in [verification](../contractor-patches/life-play/verification/README.md). QA money/unlocks are staged in browser storage only. The downloadable HTML retains normal starting conditions and existing saves. The artifact manifest records the final source commit, HTML/ZIP/patch checksums, and clean-source/actually applied patch byte-identical rebuild results.

A fresh direct `file://` smoke attempt was blocked before bootstrap by the managed browser policy (`ERR_BLOCKED_BY_ADMINISTRATOR`); it is recorded separately and is not a pass. The exact standalone bytes pass the local HTTP flow with zero external runtime asset requests. Do not bypass that policy. Physical PS5 Bluetooth pairing, hardware Fold 7 fullscreen/rotation behaviour, device-local file opening and mobile GPU frame times are not verified by browser automation. Farm ground now exposes its sides for orbit views (the starter ground snapshot is about 549k triangles in one batch); monitor hardware frame cost before adding more surface detail. Room orbit is deliberately limited by its cutaway walls. Dedicated costume-specific seated/tool art, broader garden traversal and full obstacle route planning remain on the [follow-through roadmap](../plans/life-play/ROADMAP.md).
