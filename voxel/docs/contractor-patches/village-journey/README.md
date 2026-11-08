# Village Journey — contractor handover

This update connects Mothlight to the farm's physical play and late progression. It includes the 36 menu-item illustrations from parent `dc6725e` and adds a farm gateway/direct Village dock action, a larger explorable Green, resource tools, village-earned rewards and reduced farm operation while away.

Branch: `contractor/village-journey`. Incremental journey parent: `dc6725e` on `contractor/menu-item-sprites`; combined contractor parent: `fa3ce1616919d3e75b0488421d42c7df50f0df31`. Claude's checked lead is `604fe2359427fc7e90a3d1248a6c4d1d6b0136c8`, already in that ancestry. Work stays separate from Claude's active checkout. Review this matrix before transplanting onto independently changed lead code.

## Farm and village loop

- Village is a direct farm hotbar action. A grounded timber gateway beside Skyla's east lane can be clicked or approached in play mode; crossing it enters Mothlight once the existing level 3 invitation requirement is met.
- Freestanding patch/home/meadow title boards and roadside direction boards are removed. Shop, attraction and stall signs remain attached to their buildings. The village's board is mounted on its gateway.
- Base Shane/Natalie standing art uses existing authored empty-handed poses. It is technically repacked with original stature/anchors; walking pixels and tool/costume actions remain separately defined. See `assets/owner-idle-concepts/README.md`.
- Hollow Green grows from 120×36 to 120×58 design units (61% more area). A broad southern arrival meadow and four named forage clearings join the existing square; there are 32 Green resource nodes, up from 24. Old node IDs/cooldowns are retained.
- Nearby resources use timed axe, pickaxe or hand gathering. Individual logs are about 46cm long and boulders 35cm across. Each Green node has 4–12 seeded, disjoint spawn sites; its saved gather cycle picks a fresh site while the prop is hidden. Unrelated chats and shop randomness never move visible resources. No material is awarded before completion; cancel/pause and duplicate input cannot duplicate rewards. Harvested nodes hide both art and hitbox until ready again.
- Map, People, Quests, Satchel, Workshop and Build are direct village actions. The followed quest stays pinned in a compact HUD card, with touch, keyboard T or PS5 D-pad Up expanding its requirements and hint. D-pad input remains menu navigation while a panel is open. A waypoint shows direction/distance, and Farm at work shows the current production rate and opens its upgrades.
- Village timers and quests use full play time. Farm growth, visitors, production and trade use 2.5% of elapsed time while there. Rowan's ledger/steward/network upgrades raise that to 5%, 7.5% and 10%. This slows simulation rather than confiscating a percentage of each sale. Leaving returns the farm to normal; pause still pauses both.
- Final 24-bed expansion needs Rowan's restored workshop. New fifth-variety Midnight Moon seed purchases need The Lantern Keepers quest. Already-owned land, seeds, costumes and earned levels are retained.
- The Lantern Keepers follows Two Doorbells: deliver village materials, complete 24 new farm harvests and return to your neighbour. Rewards include both mummy outfits, a moon gate and moth lamps. Two paid household sets put real inventory copies into the farmhouse collection.
- The fly-in adds clearing views and smoother camera easing. Existing tour recordings retain their text; the two new tour stops and new quest dialogue have captions and are listed in the pending narration inventory. No new recording or runtime audio service is required.
- The library, workshop and tavern receive further plum/brass interior detailing. Existing renderer/light pools are retained.

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
| Owner artwork | HD sprite metadata, body height, shared geometry, walking adapters | Re-bake approved artwork and metadata together. Retain costume/action fallbacks and original scale. |
| Narration inventory | Voice script source indices and existing recorded text keys | Do not label new subtitles as recorded speech. Current pending inventory is explicit. |

## Save compatibility

Save version 17 adds optional per-node gather cycles. Old saves start each node at its authored site and retain cooldowns; new saves preserve the selected site through reload. The official state 17 fixture is added without altering older fixtures. Resource-ready events refresh props and hitboxes during the same visit.

Future spawn sites are reserved to keep the forage routes clear. Existing village decorations that overlap a newly reserved site return to village storage on restore; ownership is preserved. Farmhouse furniture is unaffected.

## Verification and delivery

Run commands from `voxel/`: `npm test`, `node build.mjs --out /absolute/path/Pumpkin-Patch-Village-Journey.html`, and `CHROMIUM_PATH=/usr/bin/chromium node tools/village-journey-qa.mjs ...`. Some asset tests start Python/Pillow; the managed execution profile must permit child processes.

Browser evidence lives in `verification/`. It distinguishes declared fixture setup from actual taps, keyboard travel, timed gathering and emulated screen sizes. Physical Z Fold 7 hardware, PS5 Bluetooth pairing and TV casting are not certified by viewport tests. The delivery receipt records exact source/artifact hashes and patch replay.
