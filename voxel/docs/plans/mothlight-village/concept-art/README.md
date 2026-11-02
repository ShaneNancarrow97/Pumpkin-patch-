# Mothlight Village — concept art handover

**Planning reference only. The village is not implemented by this pack.** These nine generated 1536 × 1024 boards establish the visual direction for the [Mothlight Village roadmap](ROADMAP.md), including a proposed build-map view. They are not runtime sprites, texture sheets, measured plans or evidence that a feature works.

The included `ROADMAP.md` is an exact portable snapshot of the planning source at `1edc15d71a0d7c031f6aaefc95c0c76575acab3d`. The whole concept-art folder can be copied without taking any game code.

Open **[the offline gallery](index.html)** in a browser; keep the PNGs beside it. No server, network connection or external fonts are required. Open an image link for the full-resolution original.

## Direction to preserve

Moonlit, lived-in cosy horror: autumn timber, crooked gothic stone, candlelit rooms, moths, old books and gentle uncanny details. Environment forms should translate into the existing detailed voxel world; the cast should remain painted, adult-proportioned sprites. Ink plum, dusty violet and forest green sit behind warm amber lamps and restrained silver-blue moonlight. Normal menus remain **purple parchment with clear cream text**; handwritten flourishes and sparkly page edges are accents, not body typography.

Use the expansion’s original characters and stories. Preserve approved Shane/Natalie likenesses and the existing Baron design. Generated labels are illustrative: written names, requirements, costs and mechanics in the roadmap take precedence.

## Boards and what Claude should take from them

| Board | Implementation takeaways |
| --- | --- |
| [01 · World and atmosphere](01-world-and-atmosphere.png) | A separate realm with a readable road hierarchy and landmark silhouettes. Hollow Green → Moonroot Copse → Lantern Quarry → Carnival Moor → Mirror Marsh. Reserve plots and accessible routes. This is an atmosphere composition, not a navigation mesh. |
| [02 · First neighbours](02-residents-first-neighbours.png) | Elowen, Rowan, Mabel and Tansy: distinct crafts, body silhouettes and personal props. Establish one production scale, grounded feet and stable facing/anchors before making animation sheets. |
| [03 · Village life](03-residents-village-life.png) | Cinder, Opal, Corvus and Baron: public-service roles and memorable gestures. Keep Corvus raven-like and plum/navy; preserve the Baron's red velvet, head bolts and monocle. |
| [04 · Homes and gardens](04-homes-and-gardens.png) | Buildable homes for the first neighbours: glasshouse library, carpenter workshop, haberdashery and potting garden. Author real entrances, furniture space, garden access and upgrade footprints separately. |
| [05 · Venues and grand homes](05-venues-and-grand-homes.png) | Cinder's restaurant/apartment, Corvus's performance tent/private wagon, Opal's quarry studio and the Baron's manor. Separate service/queue/private circulation. The manor is not the farm's Hollow House attraction. |
| [06 · Gathering and materials](06-gathering-and-materials.png) | Grounded resource sockets, district identity and clear fresh/depleted states. Use the roadmap's yields, active-time cooldowns and caps; the art does not set new rates. Keep nodes outside roads, doors and wheelchair approaches. |
| [07 · Quests and cinematics](07-quests-and-cinematics.png) | Invitation/arrival, physical mirror clues, supplied gatherings and restoration reveals. Stage readable cause and effect; use brief, skippable scenes and compact purple-parchment dialogue. Completion comes from saved quest evidence, not the cutscene. |
| [08 · Rewards and decorating](08-rewards-and-decorating.png) | Collections worth bringing home: moth study, useful storage/workshop, kitchen/dining, wardrobe, purple wheelchair finishes, stained glass and carnival pieces. Reconcile furniture scale, wall anchors, shelf orientation and rotated bounds with the existing placement system. |
| [09 · Proposed building footprint](09-building-footprint.png) | A top-down build guide for the separate realm: broad routes, reserved home/venue plots and district unlock gates. Use [FOOTPRINT.md](FOOTPRINT.md) and [plots.json](plots.json) for the authoritative proposed coordinates, footprints and clearance. The image is conceptual and does not implement or validate the layout. |

For spatial implementation, open **[the measured footprint diagram](measured-footprint.svg)** and read **[the proposed footprint specification](FOOTPRINT.md)** before tracing any illustration. Its coordinate tables and `plots.json` take precedence over generated labels, drawn scale and apparent clearance. The proposal still needs collision, pathing, accessibility and camera checks in the real voxel engine.

## Visual review and production decisions

- Boards 02/03 define resident faces, hair, clothing and silhouettes. Board 07 defines scene framing; its incidental doll/ghost variations do not replace those character designs.
- Opal has a stoneworking studio from board 05. The glass roof drawn over plot 05 on the illustrative map is a generation drift; do not duplicate Elowen’s conservatory there. Use the measured map and plot table for location and orientation.
- Painted steps, dense plants and cliffside rooms are atmosphere cues. Build continuous accessible approaches, safe edges and unobstructed thresholds; do not copy stairs as the only route.
- Scale down board 06’s display-sized amber/crystal forms to the small authored node sockets. Keep rare light restrained and follow the written material gates.
- Mannequins in board 08 show garments, not new Shane/Natalie faces. Preserve approved owner references and production animation scale.
- These full-resolution PNGs stay in documentation. Make separately approved lightweight runtime art and voxel models; do not bundle the boards into the downloadable game.

## Resident identities and reward connections

| Resident | Home / visual identity | Rewards should connect to |
| --- | --- | --- |
| **Elowen Mothwick** | Moth witch, archivist and bookbinder; plum layers, books, moth clasp and lantern; conservatory library | Moth lighting, library furniture, moonflower cultivation, paired mothlight costumes and a crop-care branch |
| **Rowan Rattlewood** | Kind scarecrow carpenter; timber/straw, repaired apron and practical tools; workshop cottage | Material storage, workbench, shelves, timber gates and home/delivery blueprints |
| **Mabel Moonstitch** | Haunted doll tailor; porcelain joints, careful seams, ribbons and treasured coat; haberdashery | Clothing separates, paired full costumes, racks/mirrors, plait-compatible headwear and matching wheelchair finishes |
| **Tansy Thistledown** | Hedge gardener; earthy greens, fern/bramble details and herb pockets; sheltered potting cottage | Ingredient cultivation, preserves, decorative plants, useful garden pieces and hedge-witch clothes |
| **Chef Cinder** | Overworked ghost restaurateur; visible serving hands, worn chef apron and gentle smoke; restaurant with apartment | Supper/recipe families, supplied batch contracts, kitchen/dining pieces and specialist cooking stations |
| **Opal Graves** | Vampire stonemason; dusty gothic workwear, chisel/mallet, stained glass; quarry studio | Stoneworking, moonstone processing, stained glass, façades and gothic bedroom/garden collections |
| **Ringmaster Corvus** | Raven showman; clear beak/feathers, plum/navy tails, brass and cane; tent with private wagon | Lanterns, carnival furniture/stage, scare blueprints, bounded group invitations and ringmaster clothes |
| **Baron Brassbolt** | Existing wealthy monster; red velvet, head bolts, monocle and heavy silhouette; collector's manor | Display cabinets, formal Halloween clothes, luxury furnishings and limited commissions/VIP rewards |

All eight have **ten bond ranks and five personal chapters**; this pack does not add another spendable friendship currency. [Character chapters and rewards](ROADMAP.md#4-eight-residents-ten-bond-ranks-and-five-personal-chapters) remain the source for content order.

## Guardrails for the build

- **Protect the current game.** The village uses a separate carriage arrival. Do not replace the private homestead arch, farm attraction entrances or guest exits. Existing saves, ownership and level milestones stay valid; new quests open specialist/masterwork branches rather than relocking purchases.
- **Keep the return loop useful.** Explore → gather → help a resident → build/restore → earn a recipe, blueprint, costume or furnishing → use it at the farm/home → supply the next village occasion. Prototype Hollow Green, Elowen/Rowan and two homes before building every district.
- **Keep one economy.** Coins are cash; materials are objects; bonds/badges are progress. Honour finite guest wallets and existing recipe/equipment/pantry rules. No duplicated travelling inventories, repeated delivery payment or unlimited passive reward multipliers. Quest coin gifts use existing bonus-earned handling.
- **Make gathering bounded.** Use authored sockets, capped ready piles and saved active-time cooldowns; no offline stockpile or reload reroll. Full inventory leaves the node and cooldown untouched. Construction materials have their own storage; ingredients use the pantry. Star amber is optional cosmetic material, never a random story gate.
- **Make rewards dependable.** Stable claim IDs and atomic/idempotent grants prevent duplicate coins, recipes or items. Skipping/replaying a cinematic cannot change the reward. A pretty image or disappearing prop proves no transaction.
- **Design for Natalie too.** Required paths, doors, node interactions and seating must support the purple wheelchair. No mandatory jumping, precision timing or colour/audio-only clues. Offer readable symbols/text, progressive hints and assisted solutions with equal rewards; honour reduced motion.
- **Make production assets deliberately.** These boards need measured voxel footprints/collision, placement anchors and separate approved sprite/action sheets. Actual alternating walking legs, visible tools and consistent scale must be verified. Pool lights, reuse materials and stream districts instead of reproducing every painted leaf/light as geometry.

For exact scope, materials, economy, save contracts and dependency phases, continue in **[the roadmap](ROADMAP.md)**. This pack changes documentation and visual references only.
