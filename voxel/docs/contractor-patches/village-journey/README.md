# Village Journey — contractor handover

This update connects Mothlight to the farm's physical play and late progression. It includes the 36 menu-item illustrations from parent `dc6725e` and adds a farm gateway/direct Village dock action, a larger explorable Green, resource tools, village-earned rewards and reduced farm operation while away. The final increment also repairs the owners’ base walking, adds furniture illustrations, grass detail, five supplied MIDI tracks, actual food-truck checkout, later till tiers and golden fountain pumpkins.

Branch: `contractor/village-journey`. Incremental journey parent: `dc6725e` on `contractor/menu-item-sprites`; combined contractor parent: `fa3ce1616919d3e75b0488421d42c7df50f0df31`. Claude's checked lead is `604fe2359427fc7e90a3d1248a6c4d1d6b0136c8`, already in that ancestry. Work stays separate from Claude's active checkout. Review this matrix before transplanting onto independently changed lead code.

## Farm and village loop

- Village is a direct farm hotbar action. A grounded timber gateway beside Skyla's east lane can be clicked or approached in play mode; crossing it enters Mothlight once the existing level 3 invitation requirement is met.
- Freestanding patch/home/meadow title boards and roadside direction boards are removed. Shop, attraction and stall signs remain attached to their buildings. The village's board is mounted on its gateway.
- Base Shane/Natalie standing art uses existing authored empty-handed poses. It is technically repacked with original stature/anchors; the later movement increment redraws 128 base walk cells across eight views and eight phases, with alternating leg contacts and a shared 1.8-unit stride. The other nine directional character atlases and costume/tool actions are retained. See `assets/owner-idle-concepts/README.md`.
- Hollow Green grows from 120×36 to 120×58 design units (61% more area). A broad southern arrival meadow and four named forage clearings join the existing square; there are 32 Green resource nodes, up from 24. Old node IDs/cooldowns are retained.
- Nearby resources use timed axe, pickaxe or hand gathering. Individual logs are about half a metre long and boulders 35cm across. Each Green node has 4–12 seeded, disjoint spawn sites; its saved gather cycle picks a fresh site while the prop is hidden. Unrelated chats and shop randomness never move visible resources. No material is awarded before completion; cancel/pause and duplicate input cannot duplicate rewards. Harvested nodes hide both art and hitbox until ready again.
- Neighbour selection guides to a live, reachable talking spot; conversations, quest acceptance, handovers, gifts and favours require approaching the resident. Vesper must be visited at his indoor counter. Remote menu choices never spend quest items. See [neighbour proximity](NEIGHBOUR-PROXIMITY.md).
- Map, People, Quests, Satchel, Workshop and Build are direct village actions. The followed quest stays pinned in a compact HUD card, with touch, keyboard T or PS5 D-pad Up expanding its requirements and hint. D-pad input remains menu navigation while a panel is open. A waypoint shows direction/distance, and Farm at work shows the current production rate and opens its upgrades.
- Village timers and quests use full play time. Farm growth, visitors, production and trade use 2.5% of elapsed time while there. Rowan's ledger/steward/network upgrades raise that to 5%, 7.5% and 10%. This slows simulation rather than confiscating a percentage of each sale. Leaving returns the farm to normal; pause still pauses both.
- Final 24-bed expansion needs Rowan's restored workshop. New fifth-variety Midnight Moon seed purchases need The Lantern Keepers quest. Already-owned land, seeds, costumes and earned levels are retained.
- The Lantern Keepers follows Two Doorbells: deliver village materials, complete 24 new farm harvests and return to your neighbour. Rewards include both mummy outfits, a moon gate and moth lamps. Two paid household sets put real inventory copies into the farmhouse collection.
- The fly-in adds clearing views and smoother camera easing. Existing tour recordings retain their text; the two new tour stops and new quest dialogue have captions and are listed in the pending narration inventory. No new recording or runtime audio service is required.
- The library, workshop and tavern receive further plum/brass interior detailing. Existing renderer/light pools are retained.

## Final gameplay and artwork increment

- Both owners’ base walking has eight phases in each of eight directions, including visible left/right contacts, passing, toe-off and heel preparation. This covers everyday looks only. Costume action sheets and the historical 15-degree/all-actions target remain separate work. A portable old/new reviewer is supplied; reproducible source crops and contact measurements live in `assets/owner-walk-repair-concepts/`.
- Grass uses one shared 512px generated repeat tile, mipmaps and a masked shader blend. Cobblestone, water and soil retain their surfaces. It adds no meshes or lights. Source, 2×2 repeat proof and provenance are in `assets/terrain-concepts/`.
- Eight painted furniture icons illustrate the two village-earned home bundles and their six actual pieces. They use one shared 89 KB atlas. Existing accurate, finish-aware 3D home-catalogue thumbnails remain in place. See [furniture menu art](FURNITURE-MENU-ART.md).
- The supplied Crossing Field, Billie Jean, Africa, Still D.R.E. and Bohemian Rhapsody MIDIs join the existing catalogue, now 26 tracks. Original input bytes are retained. Billie Jean and Bohemian Rhapsody playback ignores long silent end markers, retaining every note and a release tail. Selection, shuffle and volume remain shared. The game plays the supplied MIDI files; no vocals or commercial recordings are embedded.
- Hungry guests reserve affordable displayed food, actually walk to Maisie’s truck, queue, pay once at the hatch and carry their dish away. Stock reservations prevent competing guests buying the same portion. Failed trips release reservations, and loading does not replay payments. Skyla’s outlet setting remains available. Food receipts use their own revenue, not pumpkin quantity. See [truck sales and tills](TRUCK-SALES-AND-TILLS.md).
- Three additional Skyla checkout tiers reach 1.1s, 0.85s and 0.65s, priced £145,000 / £215,000 / £315,000 at level 20. UI maxima now come from the rule catalogue, so all real tiers are reachable.
- Fountain seeds cost £1,500 at level 5, above the first £1,200 piñata tier. After purchase, 2.5% of successful plantings mark the existing variety with a gold star. Picking grants **10 total same-variety pumpkins and £100**, once. A star crop requires ten free barn spaces; helpers and trained batches can continue picking other eligible crops. Rolls use a saved serial rather than reload randomness. Stars and ten-pumpkin bursts use bounded shared effects and no new lights.


## Dependency matrix

| Surface | Callers / dependency | Integration requirement |
| --- | --- | --- |
| `content/village-gateway.js`, `farm-village-gate.js` | Farm scene, player targets, main click/threshold travel | Keep visual gate and reachable trigger/approach coordinates together. Existing home hedge arch remains home. |
| `main.js` update calls | `model.update(s,dt,{villageAway})` | Pass the flag in both real-time and diagnostics `advance`. Never save runtime scene presence. |
| Village farm-rate upgrades | Pure rules, saved village effects, rate HUD | Farm clocks scale once; village clock stays full speed. Gate purchases and display their real requirements. |
| Late farm/costume gates | Farm and wardrobe purchase rules + matching UI | Show the reason before spending; preserve ownership loaded from older saves. |
| Resource positions, world and navigation | Node IDs/timers, material clearings, UI proximity/waypoints | All views must use the same current position; expired resources must refresh geometry/hits without leaving the village. |
| Timed gathering | Controller/touch UI and `view.gatherTool` | Exactly one award after completion; hide held tool on cancel, finish, travel or pause as appropriate. |
| Expanded layout and tour | Terrain, navigation polygons, ground hit plane, camera design/world scale | Keep areas reachable and paths/doors clear. Later district gates remain closed by their existing rules. |
| Owner artwork | HD idle, directional atlases, body height, walk adapters | Re-bake art/metadata together. Farm, house and village use the same full stride. Retain costume/action fallbacks and scale. |
| Furniture illustrations | Chapter cards, shared CSS atlas, pure markup helper | Install once; preserve accurate 3D catalogue thumbnails and accessible text. |
| Grass detail | Farm/village masks, shared texture, shader cache key | Keep colour maps opaque after mask sampling; retain paths and fallback if tile cannot load. |
| Truck checkout | Finite wallet, displayed stock, reservation, journey pose, sale event | Charge only at completed hatch service; use `truckGuestPose` in scene and release reservations on failed/expired trips. |
| Skyla till tiers | Rule catalogue, level gates, UI maximum/current-next speed | Read limits from `SHOP_MAX_LEVELS`; never hard-code the old three-tier maximum. |
| Fountain crops | Saved plant serial, plot marker, barn space, helpers, visual event | Ten total pumpkins, one £100 payout; drain transient burst once, never save/replay effect queue. |
| MIDI additions | Original files, catalogue, parser tail trimming, shuffle UI | Trim silence only on flagged new tracks; preserve notes and old track timing. |
| Narration inventory | Voice script source indices and existing recorded text keys | Do not label new subtitles as recorded speech. Current pending inventory is explicit. |

## Save compatibility

Save version 18 adds saved fountain-seed ownership, planting serial, marked crops and separate payout totals. Version 17 added optional per-node gather cycles. Old saves start each node at its authored site and retain cooldowns; new saves preserve the selected site through reload. Official state 17 and 18 fixtures are added without altering older fixtures. Resource-ready events refresh props and hitboxes during the same visit.

Future spawn sites are reserved to keep the forage routes clear. Existing village decorations that overlap a newly reserved site return to village storage on restore; ownership is preserved. Farmhouse furniture is unaffected.

## Verification and delivery

Run commands from `voxel/`: `npm test`, `node build.mjs --out /absolute/path/Pumpkin-Patch-Village-Journey.html`, and `CHROMIUM_PATH=/usr/bin/chromium node tools/village-journey-qa.mjs ...`. Some asset tests start Python/Pillow; the managed execution profile must permit child processes.

Browser evidence lives in `verification/`. It distinguishes declared fixture setup from actual taps, keyboard travel, timed gathering and emulated screen sizes. Physical Z Fold 7 hardware, PS5 Bluetooth pairing and TV casting are not certified by viewport tests. The delivery receipt records exact source/artifact hashes and patch replay.

Final delivery: [download links, exact hashes and patch replay](DELIVERY.md). The complete source snapshot passes 904 automated tests and 21 targeted checks against the delivered HTML. Browser reports distinguish normal/light rendering and the incomplete broad repeat smoke.
