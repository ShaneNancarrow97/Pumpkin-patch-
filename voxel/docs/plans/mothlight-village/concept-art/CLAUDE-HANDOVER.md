# Claude handover — Mothlight Village concept atlas

This is a contractor **art and planning package**. It adds no gameplay, save migration, economy changes or runtime assets. The village remains a proposal.

Start with `index.html` for the nine full-resolution boards, then `README.md` for character identities and visual decisions. `ROADMAP.md` is the portable source-plan snapshot. For greyboxing, use `FOOTPRINT.md`, `plots.json` and `measured-footprint.svg`; the illustrated board 09 communicates the feeling but has approximate scale and one incorrect glass-roof studio.

## What is complete

1. World mood board and five district identities.
2. Two resident sheets covering all eight original residents.
3. Two architecture sheets covering their homes and public venues.
4. Resource landscapes and fresh/depleted node studies.
5. Quest, physical puzzle and cinematic framing board.
6. Furniture, cooking, costume and wheelchair-finish reward board.
7. Illustrated building-footprint map and separate measured layout proposal.
8. Offline gallery, generation prompts, asset hashes and handover.

## Integration boundary

Source branch: `art/mothlight-village-concepts`, based on `1edc15d71a0d7c031f6aaefc95c0c76575acab3d` from the earlier contractor UI work. **Do not merge that whole ancestry just to take the art.** Cherry-pick the concept-only commit, or copy only:

```
voxel/docs/plans/mothlight-village/concept-art/
```

The folder includes its own roadmap snapshot so it is portable onto the lead branch. Check the commit diff: every added file should be inside this folder. No existing game files need replacing. Nothing is sent directly to Claude; the pushed repository folder is the handover.

## Recommended next implementation slice

Greybox Hollow Green, carriage arrival, Elowen and Rowan plots and their gathering belt first. Verify owner/wheelchair scale, six-unit main routes, four-unit door approaches and camera fit in the current renderer. Then implement two residents, two homes and a complete farm → village → useful reward → farm loop before reproducing all the illustrated architecture.

Use one coins economy and finite guest wallets. Keep the current private homestead arch, attraction entrances, saved ownership and level milestones. New work should hook into shared materials/pantry, once-only quest claims and the existing furniture placement system. Maintain a dependency matrix when connecting those systems, as specified in the roadmap.

Character concepts are not animation sheets. Buildings are not finished voxel meshes. Set production budgets, modular materials, light pools, collision footprints, door portals and sprite anchors before generating final assets. Art-board labels and decorative steps are not authoritative mechanics or accessible navigation.

## Verification scope

All nine PNG originals are 1536 × 1024. `manifest.json` records file sizes and SHA-256 hashes. The measured-map generator checks its proposed plot/road/resource envelopes; this is planning validation, not a runtime pathing test. The archive is checked for CRC integrity and local gallery links. Existing gameplay tests are not rerun for documentation-only additions.

See `VERIFICATION.md` for the final asset, layout and gallery checks. Keep these PNGs out of `voxel/assets/` and the game bundle.
