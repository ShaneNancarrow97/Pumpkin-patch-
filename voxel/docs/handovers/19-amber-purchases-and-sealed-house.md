# Contractor: amber purchase surfaces and sealed house exterior

Branch: `contractor/haunted-house-estate`. This is an additive follow-up to the unpurchased-Hollow-menu and cocoa art fix. Keep Claude's source branch and unpublished work separate.

## Player-visible changes

- Menu purchases use opaque amber/brown cards and solid yellow-orange buttons with dark text. Affordable purchases have the strongest contrast; disabled prices use muted bronze. Owned-item actions, navigation and reward claims keep the neutral theme.
- A softly breathing, depth-tested amber outline marks the actual home entrance in the garden. The highlight follows every house size, hides during decorating/menus, and honours reduced motion. The Hollow House gains the same entrance cue only once restoration makes entry available.
- Exterior walls now have thin continuous backing surfaces under their brick detail. Roof under-courses overlap, upgraded kitchen-wing walls/gables are closed, and the tower has merged backing plus a plinth. The farm attraction also has wall/roof backing and closed gables. Window frames, slates, existing palettes and decorative detail remain.
- Resetting the estate camera accounts for the upgraded house height, giving the roof and tower more room in the default view. Orbit and pinch/pan remain available.

## Implementation

`ui/purchase-surfaces.js` marks priced actions after each changed menu body, before binding. It uses an explicit purchase-action selector list plus the displayed currency, excludes claims and ignores already-owned actions without a price. No per-frame observer or rule/economy change.

`entrance-glow.js` uses two small additive shape meshes, with depth testing and no depth writes. HDR amber participates in the existing bloom; the contour is visible when glow is disabled. No extra point lights or change in light count. Geometry is created once per scene, not every frame.

`house-estate-world.js` keeps the house in two instanced batches. Backing uses thin skins and merged courses rather than a filled voxel volume. The estate and house save shape, reserve, ownership, finish identifiers and room entry behavior are unchanged. Rooms still render in their existing interior scene.

## Verification

- `npm --prefix voxel test` includes `test/house-shell.test.mjs`: rays at mortar-joint height from all four facades and above both roof slopes across all house tiers, plus entrance occlusion/reduced-motion behavior. Existing house geometry, bounds, palettes and placement tests remain.
- `node voxel/tools/qa-amber-house.mjs /path/to/game.html /tmp/amber-house-qa` checks entrance alignment at all tiers, actual purchase debit, owned-action distinction, phone/Fold/landscape sizing, and real touch entry through the glowing door. Screenshots include front/rear exterior views and the final Fold view with bloom and shadows enabled.
- Money and levels are staged for QA. SwiftShader images establish rendering/interaction correctness, not hardware FPS.

No new save version, reset, asset generation, price changes or new dependencies. Read the accompanying verification JSON/log for final completed checks.

Completed: 153 unit tests and all 12 targeted browser checks pass with no browser errors. Final Fold image has bloom and shadows enabled; representative images and reports are in the contractor verification folder.
