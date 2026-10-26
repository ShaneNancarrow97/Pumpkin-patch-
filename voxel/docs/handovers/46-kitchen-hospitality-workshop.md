# 46 — Kitchen & hospitality workshop

Branch: `contractor/kitchen-workshop`. This merges the completed Midnight Moon branch (handover 45), builds on cooking handover 44, and preserves Claude's published `3f92ca8` world and the root 2D game.

## What is playable

**Physical home kitchen.** Buy/place six utility pieces from Cooking → Equipment: hob £600, oven £1,100, pot rail £180, pan rail £160, baking rack £220, spice shelf £260. Only items placed in the actual kitchen grant their capabilities; storage and other rooms do not. Premium range/pan rail/spice cabinet remain valid alternatives. Starting home cooking navigates into the kitchen; tap the cooker for Cook or use the compact room toolbar. Steam and warmth attach to a working appliance without additional lights. Six affordable pieces fit the first unlocked kitchen.

**Recipes and bulk cooking.** Six new dishes (14 total), six additional raw ingredients (vegetables, meat, chicken, stock, herbs, spices), pan/simmer/bake methods, exact ingredient combinations and discovery. Unmatched combinations consume nothing. Paid research remains a shortcut. Cooking 1/5/10/Max reserves and consumes the complete input run up front; output arrives one batch at a time. Reload keeps unlearned discoveries and unfinished runs. Storing equipment after starting does not destroy paid work, but prevents new starts. Cancel explicitly discards unfinished output without refund. Food storage is reserved across both cookers.

Five new dishes require home equipment; pumpkin spice biscuits also work in the truck after its paid oven (£700, L7) and seasoning kit (£260, L7). Existing v12 saves with learned baking recipes receive the oven they previously did not need, preserving that investment. The supplied paid chef can repeat truck-compatible recipes. No free inputs or automatic ingredient purchases were added.

**Maisie's Midnight Kitchen.** Recognisable native voxel truck with cab, windshield, headlights, serving hatch, wheels, receiving cart and matching cobbled court. Maisie uses the original Glen of Imaal terrier photo references: low, long, wiry grey, orange bandana and plum apron, aligned idle/blink/walking poses. She stands visibly on the serving ledge; hired chef remains a separate helper. Two tables/four bench seats sit clear of the north cart lane. New art is embedded in the offline HTML.

**Diners and food sales.** Food customers carry one finite purse, can buy 1–3 portions with carrier bags, or up to eight for rare starving guests and six for VIPs. Prices and stock are held before payment; no duplicate checkout or overselling. After leaving Skyla's shop, a paid food customer can reserve one of four seats, walk across the public apron, sit, eat and leave via the right-hand exit. This handoff never charges again. Dining is transient and is cleared by save/reload, like ordinary indoor customers. Old walking sheets are untouched; eleven existing visitors have new matching sitting art, and all four new VIPs have sitting poses.

**Visitor progression.** Bring a friend adds two tiers: maximum party sizes 6 and 8, costing £12,000/£24,000 after the existing tiers. Harvest rush costs £1,600 at L7: random 10–20 visitors every 300 game seconds. The midnight court costs £6,000 at L10: 3–5 Renaissance VIPs every 240 seconds, plus occasional rich indoor shoppers. Four new stable kinds 11–14: Duke Alder, Countess Carmine, Lord Hemlock and Sir Wisp. Each has idle/blink, four opposite-leg walk frames and seated art; normal spawning still uses only the original ten. VIPs have finite £140–250 purses. Rush/VIP can be paused separately. Saved timers/pending members resume without duplicating entered guests. Outdoor event traffic has a hard 70-guest/reservation cap and at most twenty burst places; four diners and indoor customers are additional bounded populations.

**Sandy deluxe.** Two paid stand tiers (L10/L12), ghost-wafer cocoa, caramel flake cocoa and a s'mores platter, separate prices/stock, native cup/snack shapes and generated menu icons. Paid ghost barista speeds service by 35%; paid courier crate increases supply runs to twenty portions. Selected specials can restock at real unit costs, retaining £100. Cocoa supplies, sales and receipts remain separate from pumpkin tips and food takings.

**Hayride.** A second physical tractor/wagon, independently timed and charged, costs £12,000 at L12/tier 2. Two crew upgrades (£1,800/£4,200) reduce boarding and partial-load waits. Route extensions (£8,500/£16,000) add graveyard and webbed thicket detours: actual routes increase from 186.8m to 273.2m/310.2m; paid trips last 90/110/130 seconds. Existing trips snapshot their route/time and complete unchanged. The owner's POV follows the longer route and scenery. Existing tickets/receipts and original convoy stay compatible.

**Natalie.** Free Purple wheels & dungarees wardrobe option: recognisable face, glasses, plaits and purple manual chair, two idle frames plus six rolling poses. Preserved in new and old saves; the chair is not a progression purchase.

**Presentation.** Small pixel ingredient icons, larger finished-dish images, equipment and hospitality icon atlases; skippable first-time ingredient toss/stir/bake/dish reveal, once per recipe across reloads. It is presentation only: no extra food or timer advancement. Clear select arrows, visible +/− disclosure headers, constrained side-sheet sizing and 44px touch controls. Phone, landscape and unfolded Fold menus are checked; no new permanent farm HUD was added.

## Integration for Claude

Use a clean review branch and preserve unpublished work. Do not reset your workspace or merge artifact-only branches. This is a large increment touching shared simulation, scene and UI integration files. Review `model.js`, `main.js`, `scene.js`, `places.js`, `selling.js`, `cooking-world.js`, the cooking catalogue/rules and hayride content/rules carefully.

Choose ONE patch supplied in the package:

- `workshop-from-6138eca.patch`: against completed Midnight Moon handover 45.
- `workshop-and-midnight-from-121f4cd.patch`: against completed cooking handover 44, if Midnight Moon is not already integrated.

The source branch contains both increments in history. Do not apply both patches. Do not cherry-pick the initial combined runtime commit over Midnight Moon without reviewing duplicate changes; merge the branch or use the appropriate incremental patch instead.

```sh
git apply --check /path/to/chosen.patch
git apply /path/to/chosen.patch
npm --prefix voxel ci
npm --prefix voxel test
node voxel/build.mjs --out /tmp/workshop.html
```

Schema 13 adds visitor events, kitchen revision 2/batch/discovery/equipment upgrades, first-cook flags, Sandy automation and hayride fleet/route fields. Existing v1–12 saves migrate additively. `saveData` strips customers, holds and diners. `content/pumpkin-varieties.js` remains the five-crop source of truth. Claude's private twenty-level economy is still unpublished: this preserves the current twelve levels and requires deliberate reconciliation with those gates, not replacement of private work.

All new art source sheets, references, metadata and preparation tools are under `docs/plans/kitchen-workshop/` and `tools/prepare-*`. Generation used whole sheets and shared scales/anchors. Browser shipping uses compressed WebP atlases and native voxel geometry; there are no remote runtime art dependencies or new point lights.

## Verification

See `docs/contractor-patches/kitchen-workshop/verification/` and the artifact manifest for pinned HTML hashes and source commits. The full browser flow covers paid equipment, exact mixing/discovery, reload, batch output, finite-wallet sales, raw meat/spice cooking, VIP arrival, wheelchair selection and phone/landscape/Fold control sizing. Runtime `74c55a2` also guards wheelchair startup while optional voxel actors load; the final browser pass starts with this setting and wheelchair already equipped. A focused final pass covers Maisie's visible ledge position, sitting visitors, advancing VIP walk frames and final menus after a small truck visibility/wheel adjustment. Native truck/delivery geometry tests were rerun after that adjustment.

Physical Z Fold 7 frame rate, Android file handlers and native OS fullscreen were not hardware-tested. The unchanged downloadable HTML is tested over loopback because the managed browser blocks direct file navigation. Existing fullscreen controls remain. No claim of hardware performance parity is made.
