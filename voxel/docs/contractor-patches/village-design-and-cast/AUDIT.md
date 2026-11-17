# Mothlight Village: source audit before the contractor pass

Reviewed lead: `604fe2359427fc7e90a3d1248a6c4d1d6b0136c8`, fetched from `voxel-reference` on 6 November 2026. Contractor branch: `contractor/village-design-and-cast`. This is a source audit; browser screenshots and final verification belong in the release receipt. Findings below must not be described as a completed visual playtest.

**Resolution:** this records the starting point. Runtime commit `e9e60a9` connects the saved first visit, Green object actions, hidden-target filtering, compact UI and one mood clock. Later districts remain explicitly gated. See [RELEASE.md](RELEASE.md) for final checks and [ROADMAP.md](ROADMAP.md) for the remaining work; the historical “next slice” language below is not the current implementation status.

## What the latest pushes contain

Claude has built a substantial village: five separated districts, terraced terrain, woodland links, twilight colours, fountains, ivy and culverts, the Moth Tree, a fair with a Ferris wheel and carousel, and three furnished walk-in interiors. The Velvet Bat has Vesper behind its bar; Elowen's library and Rowan's workshop contain their owners. The explorer can orbit, take a tour, walk at owner scale and enter these interiors. The farm now also has the stick cursor requested in task 182.

Keep this architectural and lighting direction. The strongest identity is the cool plum valley with warm windows and lamps, dark routes, colourful autumn crowns and distinct building silhouettes. Premium polish should clarify what the player can do, without adding a second permanent dashboard over the world.

| System at the reviewed lead | Actual state |
| --- | --- |
| Village state in the full game | `model.js` creates, restores, saves and updates `s.village` |
| Village journey from the full game | Absent: `main.js` has no village view, travel or invitation UI |
| Rules and dialogue | Usable first-neighbour rules for Elowen and Rowan; six later resident profiles are future content |
| District progression | `districtOpen()` currently returns true only for invited Hollow Green |
| Explorer | Separate fresh level-3 state; it does not load or save the farm |
| Three interiors | Present in `INSIDES`: Velvet Bat, Elowen's library, Rowan's workshop |
| Residents | Eight resident designs plus Vesper as a host; only Elowen and Rowan have friendship state |
| Character presentation | Voxel stand-ins; Elowen and Rowan have partial joints, the others stand posed |
| World interactions | The view emits node, page, stall, noticeboard, carriage and decor hits; the explorer handles only people and doors |
| Stick cursor | Implemented at `604fe23`; it is no longer an unstarted roadmap item |

## Findings in priority order

### P0: new farms cannot satisfy the new level-4 requirement

`rules/home-goals.js` now requires the invitation quest to be done before level 4. `main.js` has no invitation or travel route. Its `followHomeGoal()` does not handle `action: "village"`; it falls through to the house furniture catalogue. The isolated explorer uses another unsaved state, so completing anything there cannot unlock the real farm.

Read-only rule reproduction on the reviewed lead:

```js
const s = M.freshState();
M.recordHomeActivity(s, "visit");
s.earned = M.LEVELS[3].at;
M.awardLevels(s);
// patchLevel(s): level 3, blocked true
// homeGoal(s): level 4, action "village", invitation not completed
// villageDue(s): true; s.village.invited: false
```

The next roadmap slice should provide a real first visit and introduction loop on the saved farm state. Opening a preview or silently marking the quest done would conceal the missing gameplay.

### P1: visible objects promise interactions the explorer does not answer

`village-view.js` creates hit targets for gathering nodes, Rowan's stall, the noticeboard, the carriage, pages and decor. `village-explorer.js` answers only `village-folk` and `village-door`. Until the adapter is connected, tapping a plausible interactive object is a dead end. Add actions to one central dispatcher using the existing pure rules. Where a feature remains unavailable, show one short contextual reason rather than a permanent label over the object.

### P1: hidden hit targets remain raycast candidates

The view raycasts its full `pickables` array. Three.js raycasting does not automatically reject a mesh because it or an ancestor is invisible. Residents hidden when Everyone is turned off and hosts from previously entered halls remain in that array. Filter candidate visibility through the ancestor chain before choosing a hit. This is a source-confirmed mechanism; capture the actual hidden-host reproduction in browser QA before claiming the visible symptom fixed.

### P2: the explorer UI has avoidable mobile clutter

The initial bottom rail contains thirteen buttons split into two groups. Walking adds a long unwrapped instruction pill, a floating interaction action and the stick. Base buttons are 40 px tall, below the local 44 px minimum; the FPS display uses 11 px text. These are source-level layout concerns, with the exact overlap to be judged in 390×844, 844×390 and unfolded Fold screenshots.

Prefer a short normal toolbar: Walk, Map, Journal and More. Put district jumps and preview-only toggles in a drawer. Keep a single compact objective near an edge, with a short contextual interaction on the right thumb side. Keep FPS and renderer metrics in diagnostics. Use 12 px minimum text, 44 px targets, safe areas and restrained motion.

### P2: resident moods mix two clocks

`createVillageFolk().mood()` records `performance.now()/1000`, while `tick()` compares it with a local animation time beginning at zero. Under slow frames the explorer further clamps its time increments. A wave can therefore last much longer than 2.2 seconds. Use a consistent animation clock or a remaining-duration counter for sprites and voxel fallbacks.

### P2: progression labels currently overstate later district availability

The district data contains level gates 3/6/9/12/15, but the rule adapter currently opens only the Green. The six later residents have `playable: false`; their chat/reward arrays are not implemented. The map and character journal should distinguish a preview, a known future neighbour and an unlocked relationship. Vesper is a host, so he should not receive a fabricated friendship meter.

## Character continuity for the sprite pass

| Character | Retain from the existing design |
| --- | --- |
| Elowen Mothwick | Plum layered dress, cream moth-wing shawl and brooch, dark hair/plait, book and warm moth lantern |
| Rowan Rattlewood | Friendly stitched sack face, straw, moss-green patched coat, leather apron, worn boots, hat and carpenter's mallet |
| Mabel Moonstitch | Porcelain doll, dark bob and bow, burgundy dress, cream apron and sewing detail |
| Tansy Thistledown | Red hair, green hedge-witch hood, gardening clothes and a basket of herbs/flowers |
| Opal Graves | Pale vampire, swept light hair, dark work clothes, stone-dusted apron and mason's tools |
| Chef Cinder | Soft violet ghost silhouette, white chef hat/apron, cooking implements; a float rather than invented human feet |
| Ringmaster Corvus | Raven head and beak, dark plum tailcoat, red/gold accents, tall hat and cane |
| Baron Brassbolt | Existing wealthy monster identity: greenish skin, bolts, red velvet suit, gold and monocle |
| Vesper Nocturne | Pale vampire host, widow's peak, black tailcoat/red-lined cape, ruby jabot, shoulder bat and candelabrum |

Keep a shared bottom anchor and consistent world scale with the 2.3-unit owners. A larger hat or cape should not shrink the person. Use the existing painted character art as the style reference, not a replacement cartoon style. Keep runtime WebP compact with exact alpha; store full-resolution generation sources outside the bundled asset path.

## Scope boundary

Do not reapply the previous home/cooking patch. Claude integrated it in handover 64 and has since added finer household materials, TV/DeX controls, fishing, a physical carving stand and new farm progression. A contractor change must start at the reviewed latest lead and preserve those adapters, save files and controller work.
