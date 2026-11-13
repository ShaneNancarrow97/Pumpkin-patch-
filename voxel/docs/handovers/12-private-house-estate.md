# Claude handover: private homestead and 360° estate

Branch: `contractor/haunted-house-estate`, integrating Claude’s published `dd97819` on top of the earlier meadow/Sandy delivery. Claude remains the main developer. This contractor branch preserves the root 2D game and the published voxel systems; reconcile its small integration hooks with your unpublished buildings, fixtures, portraits, placement and visitor balancing.

## The journey

The **middle farm archway and hedge-lined path** lead to Shane and Natalie’s private estate, with a native sign above the arch. Home navigation leads to the same place. The former cottage position on the left is now the Hollow House horror maze, not a second homestead gate. The house itself is on this separate plot, with a fully modelled front, back and both sides. Tap the house or Enter house to reach the existing rooms. Back returns from those rooms to the same garden camera; Back to farm returns to farming.

One finger/left drag orbits through a full 360°. Two fingers pinch and pan; right drag pans on desktop. The edge controls orbit in 45° steps and reset the view. These are exploration camera controls, not a first-person character controller. No unseen avatar or physical walking mode is claimed.

The estate has its own render scene, perspective camera and fixed lighting. The farm simulation continues while the player is inside. The existing renderer and bloom pipeline switch views; no second gameplay canvas, new engine or runtime network assets are introduced. Input ownership switches with the scene, so an orbit gesture cannot also pan the farm or activate a building when released.

## A growing house and garden

All four house models follow **the existing `house.level`** and its room upgrades. The house grows from a small timber cottage to a multistorey haunted home with kitchen wing, dormers, balconies and spires. Stone foundations, roof tiles, beams, side and rear windows, chimneys, ivy and planting are actual native voxel geometry. Every facade is finished for orbiting. Each house uses two batched meshes rather than a mesh per cube.

| Grounds | Size | Garden capacity | Purchase | Required house level |
| --- | --- | ---: | ---: | ---: |
| Cottage garden | 26 × 24 | 12 | Free | 0 |
| Lantern garden | 32 × 28 | 20 | £650 | 1 |
| Moonlit grounds | 38 × 32 | 32 | £2,200 | 2 |
| Haunted estate | 44 × 36 | 48 | £6,500 | 3 |

House upgrades retain their original £650/£2,600/£9,000 prices. Grounds expansions are separate paid choices. A fixed 16 × 12 house reserve accommodates every future building, and the entrance path stays clear. Expansion retains every existing valid garden coordinate; buying a larger house does not wipe the garden.

Five movable welcome pieces start free. There are 16 actual voxel garden decorations: lamps, roses, pumpkins, urns, benches, bird bath, gargoyle, tree, fountain, coffin planter, rose arch, well, bat topiary, mushrooms, fire bowl and ghost. Purchase adds a reusable inventory copy. Place, select, rotate, nudge, recolour, Undo, Cancel, Done and Store use compact contextual tools. Removed pieces return to storage; there is no hidden disposal fee or passive revenue bonus. Garden charm is a collection score.

Twenty finish choices cover walls, roof, trim, front door and fence. Five baseline finishes start owned. Paid finishes remain owned and can be selected again. The actual building and garden geometry reflect the choices. Object recolours use independent material treatments, keeping cached props and glowing details intact.

## Integration and saves

- `content/house-estate.js`: shared dimensions, decor, footprints, finish IDs and costs.
- `rules/house-estate.js`: transactions, owned counts, oriented-rectangle collisions, expansion and restoration.
- `house-estate-world.js`: detailed native house/garden/decor/gate art.
- `house-estate-view.js`: independent camera, picks, geometry synchronisation and selection preview.
- `ui/estate-sheet.js`, `ui/estate-controls.js`: on-demand management and reversible placement.
- `rules/piece-colours.js`, `piece-colours.js`: shared optional saved tint IDs and independent material colouring for house, garden and foyer.
- `model.js`, `scene.js`, `main.js`: small state, rendering and navigation hooks; preserve Claude’s current versions when porting.

The combined release uses schema **9** (8 was the estate development shape). v7 saves gain a welcome garden without changing their house level, owned furniture, books, outfits, coins or earned rewards. Invalid garden placements are returned to inventory. Camera positions, selections and editing overlays remain transient.

See the [delivery README and verification record](../contractor-patches/haunted-house-estate/README.md) for the final tested artifact and commands. The [gameplay review](11-gameplay-loop-review.md) supplies balancing priorities; this estate is a personal collection goal rather than another exponential income multiplier.
