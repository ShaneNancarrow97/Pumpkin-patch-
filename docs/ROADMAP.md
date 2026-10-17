> **Note (added when importing to GitHub):** written for Midnight 2.16. This repository contains 2.10, and the documents linked below (ARCHITECTURE, BETA-GAMEPLAY, ART-BLUEPRINT and the others) were not provided. See [REVIEW.md](REVIEW.md).

# Pumpkin Patch — alpha to beta roadmap

Updated 17 October 2026 from Shane and Natalie's expanded brief. **Midnight 2.16 is the current playable alpha. B0–B6 remain incomplete milestones, with shipped portions described below.** This is a sequenced development backlog, not a promise that the next download contains the whole beta.

The goal is a cosy, spooky place worth returning to: grow and make things, run a small Halloween market, welcome different visitors, expand the grounds, and make a home together. Pumpkins remain the starting point; they become one part of a longer game.

**Delivery preference:** subsequent roadmap releases use the normal downloadable HTML. The earlier APK remains 2.10 and is not rebuilt for subsequent HTML releases.

**Android delivery (historical 2.10):** the 2.10 game also ships as a signed offline APK, with native backup file pickers and lifecycle/Back handling. This packaging milestone does not complete additional B0–B6 gameplay work. Browser saves transfer via JSON backup/import. See [Android build and installation](ANDROID.md).

Supporting documents:

- [Architecture transition](ARCHITECTURE.md): implemented module, command, inventory and save foundations; remaining architecture stages.
- [Gameplay design](BETA-GAMEPLAY.md): the long-term loop, shop economy, visitors, research, ratings and save migration.
- [Shared art blueprint](ART-BLUEPRINT.md): rooms, furniture, books, map geometry, characters and animation compatibility.
- [Library drafts](LIBRARY-DRAFTS.md): playable original prose for all ten books and the remaining picture-book art backlog.
- [Alpha review](POLISH-REVIEW.md): evidence behind existing defects and limits.

## Current checkpoint — Midnight 2.16

The source and shipped release notes were checked against this backlog on 17 October. Every B0–B6 milestone remains **partial**. Individual feature slices below are shipped; a finished UI pass does not complete beta art, economy or device gates.

| Milestone | Implemented now | Still required |
| --- | --- | --- |
| B0 · Cohesion | Shared UI styling; unobstructed notices; map drag/Fit/Explore; room editing completion; isolated decor and measured shelf sockets | Universal isometric room/furniture/actor proof; layered and seated animation; performance budgets; physical-device gates |
| B1 · Shop | Enterable Skyla shop; selected displays; independent budget baskets; indoor capacity 1/2/4/6; outdoor groups 1/2/3 and frequency upgrades; stone-path routes; one paid matching theme and three fixtures | More themes, movable shop layouts, queue-space design and deeper business choices |
| B2 · Market | Counted product inventory, reservations and Orange pumpkin chutney with batch preparation and indoor jar demand | Premium recipes, other produce, suppliers and additional on-map stall sites |
| B3 · Progression | Five upgrade branches representing 37 purchase steps across 17 cards | New research effects, patch rating, larger districts, repeatable late-game goals and bounded away progress |
| B4 · Home | Parlour, bedroom, kitchen and attic; saved room layouts and item sizes; first paid full-room styles; 50 decor items; shelf sockets and ten prose books | Full-background equivalents for all eight legacy wallpapers; isometric conversion; study/conservatory, photos, illustrated picture books and indoor actors |
| B5 · Characters | 15 complete looks with front three-quarter walk art; eight classic horror collection entries across both characters | Directional/layered separates, seated states, indoor movement, pets and Skyla hats/bandanas |
| B6 · Living nights | Five visitor designs, walking frames, music and glowing pumpkins | Eight-model target, wildlife encounters, earned timed boosts and long-session/device validation |

**This release:** placed house items have saved 50–150% sizing, with scaled book sockets and movement bounds; purchasing retains menu context; wardrobe has My outfits and live ownership/shortfall feedback; catalogue, display and visitor-card styling joins the shared visual system. Schema 13 adds item sizes and migrates original placements at 100%. No new economy bonuses, research effects or room art are claimed.

### Next work in delivery order

1. **Shared art and motion proof (B0/B5).** Build one measured isometric room, chair and bookcase, with both base characters, one legal layered clothing combination and one seated pose. Review contact sheets and moving feet in the actual room before expanding the clothing or furniture catalogue. Preserve existing art until its replacement passes.
2. **A useful premium-stock outlet (B2/B3).** Extend the preserving slice with a premium pumpkin recipe and a worthwhile longer-term spending goal. Define ingredient holds, pantry limits, demand and prices together; compare fresh, mixed and maximum farms over 1/8/24 hours. The current maximum fixtures still accumulate surplus. Do not increase production without a measured outlet.
3. **Legacy room-aesthetic parity (B4).** Convert the eight existing wallpaper purchases into compatible pre-rendered room aesthetics with previews. Preserve ownership and every item/book anchor; prove the room-style matrix at phone size.
4. **Companion cosmetics (B5).** Fit Skyla hats and neck bandanas to measured animation anchors, with ownership, remove/re-equip, previews, indoor/outdoor parity and reload checks. Other companions and expanded clothing follow the shared motion proof.

The remaining milestone requirements below stay in scope. This ordering does not mark later items cancelled or silently replace the beta target. Device work should continue alongside feature slices: physical downloaded HTML in Safari/Chrome, Fold cover/inner transitions, named-device frame/memory measurements and a twenty-minute busy-farm run remain open.

## UI and foldable feedback — 17 October 2026

Keep the game art as the main surface. Replace bulky permanent framing with compact, flat navigation and resource controls; highlight ready actions rather than every button. Menus remain in-game popups, with clearer hierarchy and touch-sized controls. Midnight 2.13 adds this visual pass, map drag-to-pan with drag/tap isolation, Fit/Explore controls and resize-aware camera centring. Browser checks include representative Fold cover/inner/rotated viewports. Actual Z Fold 7, browser chrome, folding transitions on hardware and safe-area validation remain open gates; emulation is not device certification.

## Current feedback — 14 October 2026

This update prioritises measured economy pacing, removal of map-shifting messages, shorter/smaller visitor speech, isolated furniture art and clean editing completion. Keep the large glowing pumpkin tappable. Upgrade menus should be framed **in-game pop-ups over the live farm**, with compact icon-led rows, actual prices, purchased-level bars and a clear Close action. Use the supplied references for hierarchy, dark/gold framing, a floating resource HUD and touch sizing. Keep the game’s own art and interactive simulation.

The following requests are explicitly part of the beta backlog, with separate completion gates:

- **Room expansion:** add a bedroom, kitchen and attic, alongside the existing parlour and later study/conservatory. Every room has its own saved furniture layout, theme selection, capacity, entrance and coin-priced unlock. A house upgrade should open useful rooms, not only raise one room’s item limit. Preserve existing placed furniture and global item/book ownership when migrating.
- **Room styles:** offer several purchasable, pre-rendered styles per room. Retain one shared canvas/floor footprint and attachment coordinates; vary illustrated wall/window/fireplace arrangements, furnishings built into the shell, lighting and palette. Preview each full room. Styles cannot strand a placed item or move its floor anchor. Existing eight wallpaper purchases become equivalent aesthetic unlocks without another purchase. Themes and room unlocks form longer-term coin goals, with prices tuned against the slower economy.
- **Shane and Natalie:** 2.9 adds six-frame front three-quarter walks to both originals and all full costumes. Next prove the shared directional/layered benchmark, then hats, tops, hoodies, jackets, dresses, jeans, skirts, shoes and accessories. Clothing and footwear must animate on the same pose/foot anchors; no static trouser legs sliding over moving feet. Seating and indoor movement remain separate work.
- **Classic horror collection, requested 14 October:** 2.9 adds vampire, Frankenstein’s monster, mummy and a white-masked **Midnight slasher** for **both Shane and Natalie**, drawing on classic 1990s Halloween dress-up. Eight collection entries include Shane’s existing £80 vampire and seven new purchases. Standing/Walking previews, collection filtering, owned/equipped states and the free original looks are available. These are coherent complete outfits; independently layered clothing is still planned.
- **Skyla’s accessories:** purchasable hats and neck bandanas, independently selectable and removable in her own accessories menu, with a free original look. Attach them to measured head/neck anchors for idle, blink and checkout-paw frames, preserve her calico markings and green eyes, and preview them on Skyla before purchase. Save ownership and equipped choices, then reflect them at the indoor counter and outdoor shop. Accessories must fit each animation without covering her face or floating away from her body.
- **Editing and atlas quality:** after a drag, release the selection frame; also provide Done, tap-empty-floor and keyboard exit. Item previews, placed objects and shelf masks use isolated frames so neighbouring atlas artwork cannot bleed in. Include cancellation, flipped pieces, zoom and phone-sized screenshots in the regression gate.
- **Economy:** remove unlimited streak cash, extend useful upgrade goals and measure fresh, mixed and late farms. Preserve banked coins, paid unlocks, reserved baskets and the exact value of existing stock. Surplus processing and shop/stall demand remain essential follow-up work; slowing income alone does not solve stockpiling.

The patch must keep its natural ground: no opaque plot cards, and crops/characters/visitors share ground-based depth order. Keep the large tappable pumpkin. This is delivered in 2.8 alongside independent room saves and the first full-room style previews.

Current delivery priorities are recorded in the checkpoint above. Extend the front-facing walks into the common directional art/motion benchmark with one layered clothing combination; continue shop customisation and extend the first surplus-processing slice. Outdoor budget/preference-based demand ships in 2.10. Wider separate-clothing production follows that proof. Keep expanding the home-style matrix without changing room dimensions or discarding existing wallpaper ownership.

## Shipped alpha baseline

2.2 has pumpkin farming and plot-by-plot variety upgrades, automatic sales, five visitor designs, four house appearances, fifty decor items, complete costumes, idle animation, music, and a single furnished room. Its polish release added Room/Decor shop navigation, room zoom, budget filtering and sorting, placement bounds, portable backups and safer saves.

At the 2.2 baseline, several visitors could travel at once without a persistent indoor shop. Version 2.3 introduced counted stock and reservations; 2.5 added browsing and checkout, and 2.14 added outdoor group/frequency upgrades. The historical release notes below describe each slice at its release.

**Shipped in 2.3:** scoped source modules and real bundling, explicit feature startup, registered Settings sections, typed user commands, a fixed-step simulation clock, counted product inventory/reservations, lossless schema-1 migration with original-save retention, protected unsupported saves, and notices that leave controls clear. These establish A1/A2; the actual two-customer shop and common scene/animation blueprint still need A3/A4.

**Shipped in 2.4:** shared geometry for the existing parlour, measured book sockets and shelf-lip masks in all four bookcase designs, new spine art, stable per-book attachment saves, ten original readable stories, remembered pagination and schema-1/2 migration to schema 3. This completes the alpha shelf-orientation repair and the prose reader portion of B4. A3 is still partial: current rooms/furniture are front-facing, and the isometric benchmark, walkability, seating and layered clothing remain unimplemented. See [the library review](LIBRARY-REVIEW.md).

**Shipped in 2.5:** the first enterable farm shop, Skyla as the animated calico shopkeeper, four measured display bins with variety selection, budget/preference-based indoor baskets, one till, 1/2/4/6 capacity, persistent checkout reservations, connected shop upgrades and a separate ledger with shared coins. This is the first A4/B1 slice. Outdoor buyers retain their alpha FIFO behaviour; customisable shop furniture/facade, queue-space upgrades, deeper research and other produce are still pending. See [the shop review](SHOP-REVIEW.md).

**Shipped in 2.6:** independent per-plot next-crop selections, all purchased pumpkin varieties remain available, illustrated Crops & seeds controls, stock/reservation counts, direct links from Skyla’s displays, automatic replanting with chosen seeds, and schema-1–4 migration to schema 5 preserving indoor holds. Old all-Starlight patches can now grow Orange/Moonlight for budget guests. See [the crop review](CROP-REVIEW.md).

**Shipped in 2.7:** twenty-four generated UI icons, a floating resource HUD and in-game upgrade popup; no map-shifting notice rows; shorter visitor speech; slower sales and a cooldown on streak rewards; forty-two isolated decor frames; clean drag release, cancellation and editing completion; touch selection after dragging; schema-1–5 migration to schema 6 without repricing stock or clearing purchases. See [the pacing and UI review](COMFORT-REVIEW.md).

**Shipped in 2.8:** transparent plot tap areas and depth-sorted crops/characters/visitors; bedroom, kitchen and attic unlocked by the existing house stages; independent room layouts and themes; six new illustrated room backgrounds; three paid styles; inherited selectable parlour shells; filled-shelf transfers without duplicate books; schema-1–6 migration to schema 7. Existing upgraded houses inherit rooms. See [the room and patch review](ROOMS-IMPLEMENTATION.md). B4 remains partial: the eight legacy wallpaper overlays are preserved, while their full-background equivalents, isometric furniture, indoor characters, photos and further rooms are still pending.

**Shipped in 2.9:** actual six-frame walking art for all 15 looks, constant-speed cosmetic travel with queued plot visits, shared clip anchors, trimmed previews, Standing/Walking controls and a classic ’90s collection filter. Seven new costumes complete four classic looks per character; the existing Shane vampire keeps its price and ownership. Schema-1–7 migration to schema 8 preserves the farm, wardrobe, house and shop. Pause freezes travel; reduced motion keeps a still pose during travel. See [the walking and costume implementation](WALKING-IMPLEMENTATION.md). This completes a front-facing B0/B5 slice. Four-direction locomotion, layered separates, seating, indoor actors, pets and Skyla accessories remain open.

**Shipped in 2.10:** outdoor visitors choose affordable preferred baskets, including pairs, independently of appearance. The Stall view shows live guests, stock/holds, a demand guide, missed sales and a separate outdoor ledger. Indoor reservations stay protected; arrivals are paced against early upgrades. Schema-1–8 migration to schema 9 preserves previous progress and the arrival countdown. This completes the outdoor-preference slice of B1; shop appearance/interior customisation and surplus processing remain next commerce tasks. See [the stall implementation and balance review](STALL-IMPLEMENTATION.md).

The original maximum-farm review produced **5,328 pumpkins and sold 167 in ten minutes**, leaving 5,161 in stock. With the indoor shop fully upgraded and a mixed patch, the 2.5 fixture serves 383 indoor customers, sells 830 indoor pumpkins and retains 4,331 total pumpkins after ten minutes; throughput improves, but surplus processing is still needed. New production must ship with demand, processing and spending opportunities. More produce alone would worsen the stockpile.

## The long-term gameplay loop

1. **Grow:** choose produce and pumpkin varieties for individual plots; invest in yield, growth or new growing areas.
2. **Make and stock:** sell fresh produce, turn surplus into preserves, and choose what the farm shop and food stalls carry.
3. **Welcome:** serve visitors with different budgets, preferences and basket sizes, both outside and inside the shop.
4. **Reinvest:** earn coins, improve the shop, research linked upgrades and unlock more land, rooms and business sites.
5. **Make it ours:** decorate the grounds and home, dress Shane and Natalie, keep pets, collect books and frame memories.
6. **Earn a reputation:** improve the patch's rating towards **Spooktacular**, unlocking new requests, special visitors and further goals.

Short sessions have a harvest, a customer decision and an optional discovery. Longer sessions have layout, recipe, research and collection goals. The endgame combines repeatable orders, changing in-game market themes and personal projects; reaching the best rating does not end it. No forced prestige reset or real-world attendance streak is required.

## Delivery order

Effort is relative, not a calendar estimate. Each milestone must leave a playable offline game. All milestones include save migration and mobile/desktop parity.

| Milestone | Priority / effort | Playable result | Depends on |
| --- | --- | --- | --- |
| B0 — Cohesion and comfort | P0 / medium | Clearer playfield and menus; one reliable art/placement standard; correct shelf books | Alpha review |
| B1 — A working farm shop | P1 / large | Tap the shop to enter, select stock, serve two customers concurrently, grow capacity | B0 interaction rules; product/save model |
| B2 — Produce and a small market | P1 / large | More crops, preserves, gifts, configurable food stalls and visible shop earnings | B1 inventory, demand and transactions; B0 map grid |
| B3 — A place that grows | P1 / large | Branching upgrades, rating progression, land expansion and repeatable goals | B1–B2 economy; starts with a small tree in B1 |
| B4 — A home to live in | P1 / large | Additional rooms, larger exterior, illustrated room aesthetics, readable library and framed photos | B0 art/sockets; B3 expansion rules |
| B5 — Shane, Natalie and their companions | P1 / large | Walking and seated characters, mix-and-match clothing, full costumes, animated pets | B0 character template; B4 seating sockets |
| B6 — Living nights and beta readiness | P1 / large | Wildlife discoveries, rare rewards, more visitors, temporary boosts and a tested long game | Earlier economy, content and animation systems |

The character animation proof belongs in **B0**, before producing a large clothing catalogue. B5 is the full wardrobe and pet integration, not the first time moving legs are attempted. Rating requirements and land reservations also begin before content fills the map.

## B0 — Cohesion and comfort

- Audit on-screen text: batch harvest/sale numbers, keep one short ambient bubble at a time, and put full dialogue in an intentional conversation view. Notifications never intercept a tap on a plot or building.
- Give menus consistent Back/Close behaviour, preserved scroll/filter state, clear selection and disabled reasons. Keep the full-screen top navigation; use local subtabs for new shop/home content instead of squeezing in more permanent tabs.
- Lock a shared isometric blueprint for the room, furniture, plots, buildings and outdoor decorations. Re-author art with incompatible perspective instead of distorting it to fit.
- Make one benchmark scene with a chair, bookshelf, rug, plant, lamp and book. Fix the current book orientation using individual shelf slots and spine-facing art.
- Prove Natalie and Shane's base walk cycles, one layered clothing combination and one seated pose against that scene. Record scale, foot anchors, facing directions and masking rules.
- Establish real-browser screenshots, phone interaction checks and performance measurements. Consolidate obsolete CSS only against that visual baseline.

Exit checks: shelf books sit inside correctly angled slots; furniture rests on the floor; characters pass in front of and behind it correctly; text and menus leave taps accessible. Fit/zoom, touch drag and move buttons agree. Every asset uses the blueprint or has a tracked replacement. The art proof includes a dressed moving leg, not a static outfit sliding over animated feet.

## B1 — A working farm shop

- Enter by tapping the shop's visible outline, with a labelled menu alternative. Return to the same map position.
- Add shop views for **Stock, Interior, Appearance and Upgrades**. Choose products for actual display spaces and preview the exterior sign, facade, awning and lighting.
- Start with pumpkin stock. Visitors choose a variety and one or more pumpkins according to budget, preference and availability; normal pumpkins remain useful after Starlight is unlocked.
- Separate foot traffic, indoor capacity, checkout throughput and queue space. Make capacity **1 → 2 → 4 → 6** a proposed tuning ladder, beginning with a visible two-customer upgrade.
- Animate some visitors entering, browsing, paying and leaving. Passers-by remain a separate sales route. More actors are not automatically more completed sales.
- Add product IDs/counts, stock reservations, a sales ledger and a small connected upgrade tree. Preserve existing pumpkin values and paid upgrades during migration.

Exit checks: two customers can browse concurrently; two requests for the final pumpkin cannot sell it twice; a budget shopper can choose two affordable pumpkins while another chooses one Starlight. Sold-out and too-expensive states are readable without long map bubbles. Entering/closing the menu neither pauses sales unexpectedly nor duplicates earnings. Shop appearance changes on the map as well as in the menu.

**Shipped in 2.12:** a previewable Moonlit apothecary with matching map facade and interior, a freely reusable original look, and three purchasable fixtures for two measured decoration spots. Schema 11 keeps ownership, placements and live processing/checkout state. This is the first appearance slice, not a free-layout editor: further themes, fixture catalogues, movable displays and queue-space design remain open. See [shop appearance implementation](SHOP-LOOKS-IMPLEMENTATION.md).

**Shipped in 2.14:** measured routes on the existing stone walkway for outdoor guests and indoor shop approaches; three additional outdoor-frequency levels and two group-size levels (one → two → three guests per wave). Each guest keeps a separate budget and stock choice; waves are staggered and active outdoor visitors are capped at 12. The Stall view reports traffic and links to its purchase branch. Upgrade paths now represent 37 steps across 17 cards. Schema 12 preserves original paid progress and retains older saves. This extends B1 traffic, not indoor party booking or a new district. See [visitor routes and traffic](VISITOR-TRAFFIC-IMPLEMENTATION.md).

## B2 — Produce and a small market

- Add other produce in steps. Proposed first set: **apples, berries and sweetcorn**, with growth time, footprint and demand roles distinct from pumpkins.
**Shipped in 2.11:** the first preserving bench and Orange-only chutney recipe, timed 1/5/10-batch orders, reserved ingredients, safe cancellation/reload, bounded pantry stock, illustrated jars on indoor displays and budgeted jar purchases. Schema 10 preserves processing and checkout holds together. This begins B2; premium recipes, other produce and additional market sites remain open. See [processing rules and economy](PROCESSING-IMPLEMENTATION.md).

- Add recipes with visible inputs, batch size, processing time and output: pumpkin chutney, apple butter and berry jam. Preserves provide a useful route for surplus stock.
- Stock crystals and Halloween-themed goods through a visible supplier/order system; gifts and preserves use the same stock and purchasing rules as fresh produce.
- Show indoor shop earnings separately from passers-by and stalls. Prototype a shop till/business budget; evaluate a separate shop-credit currency before committing to it. See the currency decision in the gameplay design.
- Unlock predefined market sites. Each site can hold a **hot chocolate stand, coffee stand, popcorn stand, toffee apple stand or Dutch pancake stand**. Choice affects stock, recipes, service speed and visitor demand.
- Allow stall changes with a preview of costs, stored stock and outstanding orders. Keep entrances and walking routes clear.

Exit checks: the same inventory cannot be sold at a stall and consumed in a recipe; every product has a supply source and demand; stalls visibly occupy their sites and can be revisited. Compare production, processing, sales and next-upgrade time with the alpha baseline. No product chain deadlocks because its only ingredient source is behind its own upgrade.

## B3 — A place that grows

- Expand the upgrade list into a readable tech tree with **Growing, Shopkeeping, Craft & Stalls, Home & Grounds, and Curiosities** branches. Show costs, prerequisites, effects and the next reachable goal.
- Unlock larger world districts in planned sections: an orchard/growing area, a market green, and a moon garden. Include room for new plots, trees, buildings, paths and decorations before selling the land.
- Add an overall patch rating with proposed tiers **Little Patch → Local Curiosity → Bewitching → Haunted Haven → Spooktacular**. Score service, useful product variety, functioning businesses and decoration; explain what would improve the score.
- Separate rating progress from lifetime earnings and home-only haunting points. Owning expensive items alone does not earn the top rating.
- Add repeatable requests, themed in-game market nights and collections that continue after major purchases. Offer several useful investment paths, not a mandatory purchase of every node in sequence.
- Add bounded away progress after throughput is balanced; summarize crops, processing and sales, with a visible time cap and no daily-login penalty.

Exit checks: no circular prerequisites or unavoidable purchase dead ends; multiple viable routes reach the next milestone. Existing land and purchases survive expansion. Rating cannot be farmed by repeatedly placing the same item. An endgame save still has meaningful choices after the highest house and pumpkin tier.

**Shipped in 2.13:** the first upgrade-path interface groups 32 existing purchase steps into the five planned branches. Live prices, prerequisite messages, completion counts and next available goals share existing command/ownership data. It provides direct purchases and links back to crops, shop and outfits. This is a progression guide, not a new research simulation: rating gates, new research effects, larger districts and repeatable endgame goals remain open. Save schema 11 and all previous purchase routes are preserved. See [upgrade paths](UPGRADE-PATHS-IMPLEMENTATION.md).

## B4 — A home to live in

- Add actual rooms, not only a higher furniture count. Proposed progression: main room, bedroom, kitchen, attic, library/study and conservatory. Keep a simple room switcher and independent layouts/themes.
- Grow the house's on-map footprint and visible architecture as rooms unlock: a wing, an upper floor, a conservatory. Reserve the maximum building footprint early; update its clickable outline and entrance path too.
- Replace wallpaper overlays with selectable **pre-rendered illustrated room backgrounds**. Preserve the eight owned wallpaper themes as aesthetic unlocks; give each a proper full-room preview, compatible floor, walls, trim, lighting and foreground masks.
- Standardize every existing furniture piece, bookcase and decor item against the art blueprint before expanding the catalogue substantially. Add more indoor plants and a coordinated outdoor plant/decor range.
- Snap books into correctly oriented shelf sockets; support selection, moving and removal without duplication. Open books in a readable viewer with original stories and illustrated picture books.
- Add a photo mode that hides UI, captures the current game scene and lets the player crop a picture into a wall or tabletop frame. Include photos in backup/export with a clear storage budget.
- Add one-step move/pack undo and theme goals such as a reading nook, witch's study or cosy conservatory.

Exit checks: every room can be entered, furnished, themed and saved separately; the exterior visibly corresponds to its upgrades. All eight legacy wallpaper purchases retain an equivalent aesthetic. All ten existing books have readable content, with at least two illustrated picture books before beta. A framed photo, shelf contents and layout survive reload, transfer and room upgrades. Furniture cannot block the only door.

## B5 — Shane, Natalie and their companions

- Extend the 2.9 front three-quarter six-frame patch walks to the supported world directions, shop and home. Both original looks and every current full costume already have idle/walking art; turning, routes and indoor occupancy still need implementation.
- Offer individual **hats, tops, hoodies, jackets, dresses, jeans, skirts, shoes and accessories** for both characters, fitted to their respective base models. Preserve their recognisable faces, hair and familiar details.
- Keep complete Halloween costumes as higher-cost cosmetics alongside personal outfits. Existing bought costumes stay owned; a full costume remembers the player's previous separates.
- Animate clothing with the body: moving legs, footwear, hems, sleeves and coats use shared timing and anchors. Define incompatible clothing slots rather than allowing accidental overlap. Every legal combination needs working idle, walk and seated states.
- Let players bring Shane and Natalie inside. Drag a character onto a compatible chair to seat them; provide tap-select → Sit as a phone/keyboard alternative. Add a small seated idle/read animation and an obvious Stand action.
- Add **cat, dog and bat** companions with idle, movement and rest/perch loops. Pets can live in rooms and use assigned beds/perches; a bat flies rather than walking with the dog frames.

Exit checks: both characters work in all supported directions with no frozen clothing, hovering shoes or exposed previous outfit. A dress and a long coat pass walk/seat checks. Two characters cannot occupy one seat; packing an occupied chair safely stands its character up. Pets and characters do not duplicate on room changes. Care is optional and absence does not harm pets.

## B6 — Living nights and beta readiness

- Expand beyond the current five visitor designs. Proposed beta target: at least **eight distinct models**, with walking frames, clear silhouettes and varied shopping profiles; appearance is independent of spending power.
- Add ambient butterflies and moths, including a rare glowing ethereal butterfly. Some are scenery; clearly signalled encounters can be tapped/caught in time for coins or a rare collectible reward.
- Prototype **Moon Motes** as a rare-item token, subject to the currency decision. Give rare items a transparent acquisition route; an optional field guide records discoveries. Missed insects do not remove progress.
- Add earned temporary boosts, including a **ten-second instant-grow-and-harvest** burst. Define its cycle limit, pause behaviour, timer, yield and stacking before tuning the reward. Keep its stock output compatible with shop demand.
- Bring scene transitions, planting/carrying poses, subtle pumpkin glow, wildlife, sale sounds and room ambience together. Respect reduced motion and separate music/effects controls.
- Validate long sessions and returning-player loops, then close the device, save and packaging gates below.

Exit checks: active players can enjoy discoveries and boosts while idle players can still progress; one insect/boost claim cannot pay twice; repeated reloads and clock changes do not mint rewards. Reduced motion offers a stationary accessible encounter target. Busy farms retain readable animations and unobstructed controls.

## First implementation slice — current status

1. Shelf slot orientation, separate spines and the prose reader are shipped. Front-facing base/full-costume walks and the eight-entry classic collection ship in 2.9. The universal directional isometric room/actor/layered-clothing benchmark is still pending.
2. Product inventory, transaction reservations and lossless save migration are shipped.
3. The shop is enterable with selectable displays and animated Skyla. One matching facade/interior theme and three fixtures for fixed spots shipped in 2.12. Further themes, movable displays and flexible interior layouts remain pending.
4. Two-customer browsing, budget/preference-based baskets, capacity and checkout upgrades are shipped. Independent next-crop choices now keep affordable pumpkin varieties useful after purchasing Starlight.
5. Browser touch/viewport checks and ten-minute economy fixtures are recorded. Physical downloaded-file checks, longer session tuning and performance budgets remain open.

The next visual foundation extends the shipped walks into the shared isometric scene and layered character-animation benchmark. Outdoor preferences shipped in 2.10, the Orange-only preserve in 2.11, matching shop appearance and fixed fixtures in 2.12, the five-branch upgrade guide in 2.13, and path-bound visitor groups in 2.14. Commerce continues with more shop themes/layout choices, premium surplus outlets and further recipes, measured against demand and pantry throughput. Further produce and large separate-clothing catalogues follow those contracts; the full B0–B6 list remains the beta target.

## Beta completion gates

- **Scope:** B0–B6 exit checks are met. If a feature needs to move later, record it explicitly rather than silently calling the reduced scope beta. The content counts above are proposed minimums for planning, not completed assets.
- **Long game:** test fresh, midgame and fully upgraded saves under active, mostly idle and mixed play. Simulate 1-hour, 8-hour and 24-hour runs; record production, ingredient use, sales, queues, earnings and time between worthwhile purchases. Playtest across several sessions as well as simulating. Tune pacing targets before content prices are locked.
- **Economy:** repeat the original ten-minute stockpile test and a mixed-product version. Inventory growth is bounded or has useful, visible outlets; demand upgrades and late-game spending are tested together. No negative stock, double sales or inaccessible progression.
- **Art:** the full furniture catalogue, all room aesthetics, expanded map plots, all legal clothing slots, full costumes, pets and visitor animations meet the shared blueprint. Use representative in-game contact sheets and motion captures, not isolated concept art, as evidence.
- **Mobile:** actual downloaded HTML runs on iPhone Safari, Android Chrome and desktop Chrome. Check 320/390-wide portrait, tablet and phone landscape; every menu, tab, drag alternative, building entrance, rotation and background/resume works. Audio starts after a gesture. Automated Chromium checks now run against the exact offline HTML at an isolated origin. Physical downloaded-file opening, browser chrome and hardware folding transitions remain unvalidated.
- **Clarity:** a new player can harvest, stock the shop, identify a visitor's need, make a sale, buy an upgrade and place decor without developer narration. Text never hides the interaction target; important feedback is available outside transient effects.
- **Performance:** establish frame-time, memory and download-size budgets on a named representative phone in B0; test the largest district, a full shop, furnished rooms and maximum animated actors. Confirm no steady resource growth over at least twenty minutes. Reserve art memory for outfits and backgrounds before finalising counts.
- **Persistence:** versioned migrations preserve alpha coins, inventory, plot upgrades, all fifty items, books, costumes and wallpapers. Round-trip rooms, photos, business stock, recipes, research, clothing and pets through backup/import/undo. Invalid future saves fail clearly without overwriting the active game.
- **Offline release:** package all required art/audio/logic; verify asset manifests and archive/HTML consistency. Document exact browser checks and any remaining limitation. Keep the playable alpha available during development.

## Decisions to test, not silently assume

| Decision | Working direction | Resolve by |
| --- | --- | --- |
| Shop-generated/internal currency | Give the shop its own earnings ledger and reinvestment view. Compare a dedicated till with spendable shop credits; avoid a currency that only duplicates coins. | B2 economy prototype |
| Rare rewards | Prototype Moon Motes for rare cosmetics; compare with collectible unlocks paid for using ordinary coins. | Before B6 reward prices |
| Capacity, product and land counts | Start with the ladders and minimum content sets above, then tune against active/idle tests and map space. | Each owning milestone |
| Projection and animation frame counts | Use the proposed 2:1 blueprint and shared cycles; validate against likeness, camera and phone readability before batch production. | B0 art proof |
| Room variety versus asset size | Full illustrated aesthetics must retain placement geometry; measure the room-shell/theme matrix before generating every background. | B0/B4 art plan |

## Still outside this beta

Multiplayer, accounts/cloud sync, real-money transactions and a 3D conversion. Forced prestige resets and punitive pet upkeep are also outside the proposed loop. **Rare rewards, additional currencies under evaluation, more produce, more rooms and a larger useful catalogue are now in scope**; the older blanket deferral of these ideas no longer applies.

### Visual refinement shipped in 2.15

Unified popup geometry, controls, card surfaces and typography; aligned all five navigation tabs; clearer affordable/disabled/completed states; visible upgrade/home wallets on phones. Browser visual review covers six surfaces at five representative sizes. Physical Fold and downloaded-file device testing remain open. See [critique and corrections](UI-REFINEMENT-REVIEW.md).

### Menu continuity and collection polish shipped in 2.16

Wardrobe purchases and shop upgrades retain their scroll/focus context. My outfits filters existing ownership, live counts and shortfalls clarify wardrobe choices, and the decor catalogue, shop displays and visitor status cards use the shared minimal theme. Small-screen inputs retain a readable 16px size. Lantern-lit primary/secondary controls add fine edge highlights, subtle gradients, clear pressed/focus states and reduced-motion parity. The source audit above corrects stale shop-appearance and browser-block notes; schema 13 preserves existing progress and adds item sizes; gameplay prices remain unchanged.

**House-item sizing (2.16):** placed furniture, rugs, wall decor and lamps support free 50–150% size changes in 10% steps, with Reset, bounds, scaled shelf contents, pause, transfer, save and backup parity. Existing placements migrate at 100%. New placements use their original size. This completes the resizing request; it does not complete the isometric art conversion.
