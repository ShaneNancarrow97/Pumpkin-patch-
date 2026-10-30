# Directional owner atlas contract

This is an asset contract and production plan on the contractor branch based on lead `b387c85`. It does not announce completed costume/action artwork. `content/directional-atlas.js` has no renderer, asset imports or save changes. The current game is not replaced merely by importing the module.

## Why larger sheets alone will not fix the characters

Lead handover 55 found profile heads about 1.33 times wider than Natalie's front and 1.38 times wider than Shane's. Its measured view factors partly compensate, and it turns the owner to the camera after 0.8 seconds because the side/back strips have no neutral idle. Copying those frames into a larger atlas preserves both problems. New art needs the approved front's body/head ratios, an actual neutral stance and genuine opposite leg contact phases.

Lead 56 also added garden traversal, and 57/58 added garden crops, interaction prompts and the carving bench. A new adapter must retain those paths, the local action rules, the separately rendered carving view and its controller. Sprite changes must not change purchases, crop yield, level timing or saved state.

## Coordinates and physical scale

The production grid has 24 camera-relative bearings: 0, 15, …, 345 degrees. Zero faces the camera, 90 faces screen-right, 180 faces away and 270 faces screen-left. `directionFromView(screenRight, awayFromCamera)` converts the existing heading projections to this convention. `directionalBin` wraps at 360 and returns null for invalid numbers. The renderer must keep the last valid heading when input is zero.

Each look has one approved seed and `pixelsPerUnit`. It defaults to the existing 320 pixels / 2.3 world units, but it must be measured against the approved front, not copied blindly when a master frame has another resolution. Every frame in a look shares that physical scale. Hats, hair and costume accessories extend above/beyond the body; they do not increase the body's world size. A crouch remains shorter than standing: never resize every action's alpha bounding box to standing height.

A frame has a local ground-contact anchor. Source preparation aligns foot contact, hip line, shoulder line and head proportions with one shared scale per strip. Anchor coordinates remain local to each rectangle, even when padding differs. The runtime draws `rect.w / pixelsPerUnit` by `rect.h / pixelsPerUnit`, translated around that anchor. New accepted art must not also receive the legacy `PLAYER_VIEW_SCALE` compensation; keep that only for the old fallback path. Releasing control must restore the normal autonomous texture, size and geometry.

Left/right views are authored separately. Mirroring is a rendering convenience and cannot establish a new bearing: tattoos, clothing seams, holsters and asymmetric accessories belong on their correct sides.

## Manifest shape

```js
{
  version: 1,
  look: 'natalie-base',
  owner: 'natalie',
  mobility: 'walking', // or wheelchair
  sourceSeed: 'review/approved/natalie-front.png',
  pixelsPerUnit: 320 / 2.3,
  pages: [{
    id: 'walk-000-045',
    url: 'assets/directional/natalie/walk-000-045.webp',
    width: 2048, height: 1280,
    encodedBytes: 0 // replace with measured output bytes
  }],
  clips: [{
    action: 'walk', degree: 0,
    authoring: 'drawn', // or genuine rig-rendered sprites
    review: { approved: true, preview: 'review/natalie-walk-000.gif' },
    frames: [{
      page: 'walk-000-045',
      rect: { x: 0, y: 0, w: 256, h: 320 },
      anchor: { x: 128, y: 310 },
      pixelsPerUnit: 320 / 2.3,
      fingerprint: 'sha256-of-the-cropped-rgba-frame',
      phase: 'contact-left'
    } /* seven more phases */]
  }]
}
```

A single neutral direction is useful before four breathing frames are finished. An idle clip can declare `mode: 'pose'` and contain one approved frame. Selection can show it, but coverage reports it as an authored pose rather than a completed breathing animation. No other action accepts this shortcut.

The page is only storage. Each clip states its actual action, degree, provenance, visual review and ordered frames. A costume can use several pages without changing its identity or gameplay inventory ID. `createDirectionalManifest()` intentionally creates empty page/clip lists; it does not populate pretend assets.

## Required production inventory

| State | Frames per direction | Review focus |
| --- | ---: | --- |
| Idle | 4 | Neutral feet, breathing, stable height |
| Walk | 8 | Contact-left, down-left, passing-left, up-left, then the opposite stance cycle |
| Jog | 8 | Both leg contacts and a distinct quicker stride |
| Plant | 6 | Reach, crouch, seed release, recovery |
| Water | 6 | Both arms grip/reach correctly; can and nozzle sockets |
| Harvest | 6 | Reach, lift, hold, recovery |
| Clean | 6 | Tool/arm sweep and recovery |
| Interact | 6 | Reach/touch, readable hand contact |
| Sit | 4 | Real seated pelvis/legs, furniture socket |
| Read | 4 | Hands/book, eye line |
| Pet | 6 | Reach and stroke beside the actual companion |
| Cook | 8 | Reach/stir/work/recovery at the existing kitchen |
| Carve | 8 | Braced hand and carving hand; keep the existing bench's interaction rules |

The base target is 80 frames per direction, 1,920 per look. The current 20 looks are nine Shane looks and eleven Natalie looks, including the wheelchair. Every costume needs its own verified matrix. A recolour of the same base cut does not need duplicate texture art if the colour transform is deterministic and all anchors stay unchanged.

Wheelchair walk/jog are locomotion APIs, not claims of walking legs. Their eight phases are reach, grip, push-start, push, release, recover-low, recover-high and reach-return. Legs stay supported; palms move on the rims and wheel rotation changes. Chair/seat contact and reachable tool heights need dedicated action art. Do not fold a wheelchair into a second seat or mirror an asymmetric chair without approval.

## Honest coverage and selection

`validateDirectionalManifest` checks structural validity. Incomplete/unreviewed clip warnings do not make a partly populated manifest unusable; `directionalCoverage` separately reports completed clips, authored static poses and every missing action/direction. It rejects missing review, bad page rectangles/anchors, scale drift, missing fingerprints, repeated phase pixels and copied complete sequences.

`selectDirectionalFrame(manifest, { action, yaw, progress, allowNearest })` returns one of:

- `coverage: 'authored'`: the requested 15-degree bin has accepted art; `mode` says pose or animation.
- `coverage: 'fallback'`: an explicitly permitted nearest authored direction of the **same action and look** was used; both requested and actual direction remain visible to diagnostics.
- `coverage: 'missing'`: no usable clip. The integrating renderer may retain the proven legacy path, with that gap reported honestly.

For a live renderer, call `compileDirectionalManifest(manifest)` **once** after metadata loads. It returns a deep-frozen snapshot with `look`, `owner`, `mobility`, `pixelsPerUnit`, `validation`, `coverage`, `actions`, `pageMap` and `select(options)`. `pageMap` and `actions` are frozen property dictionaries (not mutable JavaScript Maps); access a page as `compiled.pageMap[frame.page]`. Exact and nearest clips for each of the 24 bins are precomputed. `compiled.select` does table lookups and phase arithmetic only: no validation, sorting, fingerprint scans or source metadata reads in the frame loop. Accepted clips, frames, rectangles, anchors and pages are copied and frozen, so subsequent mutation of the source cannot silently change accepted art. Recompile explicitly when replacing a manifest. The direct `selectDirectionalFrame` API remains useful for tools/tests but revalidates source data and should not be used every rendered frame.

The selector never substitutes another costume or action. A nearest 90-degree walk shown at 75 degrees does not fill the 75-degree production cell. A rotated plane is not a photographed/drawn new body angle. No crossfade between old views earns authored coverage. Pixel fingerprints and metadata cannot prove correct leg motion or likeness: a human must inspect the preview at game scale before setting review approval.

A static-idle and cardinal-walk first batch can therefore improve play immediately without advertising 24-bearing walking or every costume as finished. Keep the detailed matrix in source/handover diagnostics, not as implementation text on the player's screen.

## Memory and delivery budget

At 256 × 320 RGBA pixels per frame:

| Set | Frames | Decoded RGBA | Approx. including mipmaps |
| --- | ---: | ---: | ---: |
| One four-direction walk page, 8 frames each | 32 | 10 MiB | 13.33 MiB |
| One look, all 24 walk directions | 192 | 60 MiB | 80 MiB |
| Twenty looks, walks only | 3,840 | 1.172 GiB | 1.563 GiB |
| Twenty looks, all 13 states | 38,400 | 11.72 GiB | 15.625 GiB |

Compression does not reduce decoded GPU texture size. Encoded WebP bytes must be measured from the generated art; the budget helper reports them as unknown until supplied. For illustration only, 5,000 encoded bytes per frame would make walks about 18.3 MiB on disk and the full target about 183 MiB before HTML's roughly 4/3 base64 overhead. These are estimates, not promised asset sizes.

Use up to four directions × eight frames in a 2048 × 1280 page, or smaller tight pages for sparse action groups. Do not make one texture containing every costume/action. Decode/upload only the equipped look's current action/direction page and a bounded neighbouring page. Use an LRU budget, reference-count pages shared by both owners, and dispose evicted texture GPU allocations. Prewarm the next useful page one frame at a time. Full master sources can remain larger than the shipping pages.

The offline HTML can embed encoded sources without decoding all of them. It still pays file size and base64 overhead, so a complete 38,400-frame master collection may need a different distribution strategy. Keep existing normal gameplay and save data available while each reviewed batch is integrated.

## Integration and acceptance

1. Generate a whole strip from an approved pose, with the photographed likeness and current costume proportions preserved.
2. Normalise with one shared scale and ground anchor; measure head/body and limb landmarks, not just total alpha height.
3. Make contact sheets plus loop previews. Inspect front, both profiles, back, diagonals, opposite contacts, stance transitions and arm/tool contact at the actual game size.
4. Enter only reviewed cells in the manifest and retain missing cells in coverage output.
5. Integrate camera-relative bearing and explicit fallback beside the existing `playerAnimate` adapter. Preserve lead 55's legacy sizing/settle behaviour until a requested new state has valid art, and lead 56–58's garden/doorway/carving paths.
6. Test farm, garden and all rooms, costume changes mid-action, camera rotation while stationary/moving, pose entry/exit, wheelchair, controller input and page eviction. The root 2D game and saves remain untouched.

This module has native tests for bins, exact/fallback selection, incomplete assets, unique phases, copied directions, physical scale/anchor errors, static idle versus breathing, wheelchair phases and budget calculations. No browser or hardware performance result is implied by these contract tests.
