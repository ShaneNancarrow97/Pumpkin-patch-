# Owner sprite production inventory

This contractor work is isolated from Claude's active lead branch. The source base is `b387c85`; no purchases, saved wardrobe IDs, economy rules or level timing are changed by this asset plan. The playable legacy wardrobe remains in place while reviewed replacements are added.

## What the full request means

The current voxel wardrobe has **20 looks: 9 for Shane and 11 for Natalie**, including Natalie's purple wheelchair and dungarees. Base recolours reuse the relevant base artwork and are not additional authored bodies. The production contract has **24 camera-relative bearings** and **13 action sets**, totalling **1,920 frames per look, 38,400 frames across the existing wardrobe**. This is a target inventory, not a claim that those frames have been made.

The bearings are 0, 15, …, 345 degrees: front at 0, screen-right at 90, back at 180 and screen-left at 270. The first painted turnarounds use manually assigned nominal bearings. They do not constitute physically measured 15-degree renders from a rig. A future rig must earn that geometric claim through its camera setup and render metadata.

| Action | Required frames per bearing | Visual acceptance |
| --- | ---: | --- |
| Idle | 4 | Neutral feet, breathing, no head-size change |
| Walk | 8 | Left contact, down, passing, up; then the opposite leg cycle |
| Jog | 8 | Distinct faster stride, both contacts, stable stature |
| Plant | 6 | Reach and bend, visible hand use, return to stance |
| Water | 6 | Handle grip and pour, hand socket for the separate watering-can sprite |
| Harvest | 6 | Reach, lift and recover without changing body scale |
| Clean | 6 | Visible tool use with a stable ground anchor |
| Interact | 6 | Purposeful arm action with correct hand position |
| Sit | 4 | Seated proportions and a furniture attachment anchor |
| Read | 4 | Book position and restrained arm/head motion |
| Pet | 6 | Reach appropriate to the pet's height and contact point |
| Cook | 8 | Visible preparation/stirring, utensil sockets |
| Carve | 8 | Bench-height hands, carving tool contact |

A single neutral frame can be reviewed as `mode: 'pose'`. A genuine four-frame gait can be reviewed as `mode: 'reduced'`, ordered **contact-left, passing-left, contact-right, passing-right**. Both can be useful in play, but neither completes the full animation requirement above. Eight different pixel hashes alone do not prove a correct eight-phase gait. Repeated leading legs or repeated four-phase cycles must be rejected or explicitly reduced.

For Natalie's wheelchair, locomotion is a push/recovery cycle with correctly rotating wheels and arm movement. Do not apply a walking-leg test or enlarge her seated body to a standing body's alpha height. Its full contract uses reach, grip, push-start, push, release, recover-low, recover-high and reach-return; a reduced cycle uses indices 0, 2, 4 and 6.

## Every existing look

“In production” below means a reviewed replacement may be present in the current contractor snapshot; use the generated report for its exact accepted angles and actions. “Pending” means the legacy look stays playable and has not been promoted to complete new directional coverage.

| Wardrobe ID | Character / look | New directional production |
| --- | --- | --- |
| `shane-base` | Original black beanie and jacket | In production: shared body/proportion reference |
| `shane-vampire` | Midnight vampire | Pending |
| `shane-skeleton` | Dancing skeleton | Pending |
| `shane-scarecrow` | Pumpkin scarecrow | Pending |
| `shane-frankenstein` | Patchwork monster | Pending |
| `shane-mummy` | Moonlit mummy | Pending |
| `shane-slasher` | Midnight slasher | Pending |
| `shane-chucky` | Chucky costume | Pending |
| `shane-jason` | Jason costume | Pending |
| `natalie-base` | Olive knit, glasses and boots | In production: shared body/proportion reference |
| `natalie-witch` | Harvest witch | Pending |
| `natalie-ghostbride` | Ghost bride | Pending |
| `natalie-batqueen` | Bat queen | Pending |
| `natalie-vampire` | Velvet vampire | Pending |
| `natalie-frankenstein` | Patchwork monster | Pending |
| `natalie-mummy` | Moonlit mummy | Pending |
| `natalie-slasher` | Midnight slasher | Pending |
| `natalie-tiffany` | Tiffany costume | Pending |
| `natalie-freddy` | Freddy costume | Pending |
| `natalie-wheelchair` | Purple wheels, dungarees and plaits | Pending: separate seated/push reference |

## Reproducible coverage report

From the repository root:

```sh
node voxel/tools/directional-coverage.mjs
node voxel/tools/directional-coverage.mjs --out /tmp/directional-coverage.json
```

`--json` writes the complete report to standard output. `--manifest <path>` reviews another combined manifest. The report reads the actual wardrobe catalogue and the same compiled acceptance contract used by play. Each action lists `full`, `pose`, `reduced`, `absent` and `incomplete` bearings. `incomplete` includes poses and reduced cycles because their full target still remains. `authoredFrames` counts the actual accepted frames, without padding them to a target length.

Legacy playability is reported separately. Nearest-bearing selection, legacy fallback, mirroring, recolours and a copy of a previous sequence do not create new authored coverage. A still profile is not a walk. A front-view action shown from a side camera is not a newly authored side action.

## Production order and handover rules

1. Approve both base bodies against the supplied photos and the existing art: face, head height, shoulders, body shape and clothing silhouette. Natalie retains her curvy build; Shane retains his moustache/goatee and familiar dark clothing. Keep asymmetrical jewellery, tattoos and clothing on their correct sides.
2. Approve neutral views and actual opposite-foot gaits before repainting costumes over that body reference. Review front, back, both sides and both diagonal pairs. Do not infer acceptance from frame count or unique hashes.
3. Add working actions with hand, prop and furniture sockets. Keep the separate illustrated watering can; do not paint a second can into the figure. Preserve reduced height when bending, sitting or reaching.
4. Produce each costume as its own reviewed set, using the accepted body proportions and phase poses. Do not substitute the base look when a costume's new action is missing. Preserve the existing playable costume until its replacement passes.
5. Complete the intermediate bearings for every action, plus breathing and full eight-phase gaits. A future rig can produce the wider matrix only once its likeness and silhouettes match the approved art.
6. Review in the offline art bench and in the actual farm, garden and rooms. Check stationary feet, opposite contacts, phase order, camera turning, door traversal, recolours and changes of costume. Record exact coverage and remaining gaps in each contractor handover.

Each strip uses one physical scale and ground-contact anchor. Normalising each crouched or airborne phase's alpha box independently would stretch the person; do not do it. Static turnarounds can be reconciled to the same measured standing body, preserving aspect ratio. Heads and hats must be measured separately from the whole silhouette when checking ratios.

### Route to exact 15-degree coverage

For the complete matrix, prepare one approved articulated body per owner, with costume layers sharing its skeleton and scale. Match the painted silhouettes and faces before mass rendering; a generic block character is not a replacement for the supplied likeness. Lock the render camera, ground origin and pixels per unit, then rotate the body through exact 15-degree steps. Author walk contact and recovery poses, plus hand/tool interactions, once on the body and review each costume for cloth, hat, skirt and accessory occlusion. Render the approved animations to sprite pages and retain the camera/rig metadata as `rig-rendered` provenance.

No such complete owner rig is delivered in this batch. Until it exists and passes the art review, the manually painted bearings remain nominal and each accepted animation still requires strip-by-strip anatomical review. Do not label a rotated flat picture or a mirrored frame as a rig render.

Runtime pages stay compressed WebP and decode on demand. GPU RGBA bytes are reported separately from download bytes: a small file can still become a large texture. Keep approved source PNGs, rejected candidates, previews and measurement notes under `docs/`, outside the playable HTML. Avoid one enormous all-costume atlas on mobile.

At the current 256 × 400 cell size, the full 38,400-frame target would occupy **14.65 GiB of raw RGBA**, or **19.53 GiB including a complete mip chain**, if every frame were resident. These are decoded texture estimates, not download sizes. The runtime must page and evict artwork rather than allocate the whole target. This batch limits a page to 12 MiB of base-level RGBA and a 4096-pixel axis; four such resident pages require at most 48 MiB before mipmaps. The report's `pageRGBABytes` totals all unique authored pages, not the current resident working set.

## Pets

Sandy's contractor correction is a separate accepted asset change: a smaller, lean, long-bodied, short-legged tan dachshund. The home-state contract stays idle, two walk poses, wag, sleep, stretch and feed. Two contact/pass images must not be described as a completed four- or eight-phase walk. Skyla and Maisie's approved pixels and metadata are retained by that correction. Future full pet turnarounds and richer movement states remain separate production work; this owner inventory does not count them as done.
