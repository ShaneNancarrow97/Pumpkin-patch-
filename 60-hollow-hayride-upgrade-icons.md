# 60 — Hollow Hayride upgrade icons

Contractor branch: `contractor/directional-character-atlases`, after handover59's
owner sprite and Sandy batch. Claude's active lead branch remains unmerged.

The hayride purchase and management screens now use twelve custom painted icons
in the same amber/plum/brass style as the existing game. They cover all three
tractor tiers, the second tractor, station crew, both route extensions and every
scare upgrade. The owned screen's header changes with the attraction tier, and
the tier track shows the three tractor silhouettes.

The icons appear beside the existing names, explanations, prices and gate text.
Upgrade buttons and scare toggles retain their original handlers, disabled rules
and touch targets. A scoped flex wrapper makes room for the art; there are no new
management screens or permanent world overlays. Economy, map/ride models,
pathing, progression and save data are unchanged.

## Files and art contract

- `assets/hayride-upgrade-icons.webp`:12 cells,4×3,768×576,216,628bytes.
- `src/content/hayride-icon-map.js`:actual catalogue IDs and grid coordinates.
- `src/ui/hayride-icons.js`:one cached embedded blob URL; decorative aria-hidden
  spans. Unknown IDs return empty art, leaving labels available.
- `src/ui/hayride-sheet.js`, `src/ui/hayride.css`:menu integration only.
- `test/hayride-icons.test.mjs`:catalogue coverage, dimensions and mobile budget.
- `tools/bake_hayride_icons.py` and `docs/plans/hayride-upgrade-icons/`:source,
  preparation script, packed review, measurements and browser evidence.

See the art folder's README for exact row/column mapping and reproduction. Only
the WebP is imported by the offline build; generation PNGs stay in documentation.

## Claude pickup

Review handovers59 and60 together for the combined contractor branch. The icons
can also be taken independently: mapping/helper/test commit `2e835db` plus the
subsequent art/menu integration commit. Their dependencies are the existing
hayride catalogue and sheet at review base `b387c85`; they do not require the new
owner atlas runtime. Preserve newer lead changes when reconciling the sheet and
its CSS. Do not merge the download-only artifact branch into game source.

The combined small binary patch and downloadable offline HTML are described in
`docs/contractor-patches/directional-cast/README.md`. Its verification folder pins
the final game hash and reports; the icon-specific folder contains actual-menu
screenshots. Any remaining owner/costume sprite gaps are still tracked by
handover59's production matrix and are not completed by this icon addition.
