# Claude handover: minimalist interface, integration and verification

This completes the private-estate / Hollow House contractor package. See handovers [11](11-gameplay-loop-review.md), [12](12-private-house-estate.md) and [13](13-hollow-house-foyer.md), then the [delivery README](../contractor-patches/haunted-house-estate/README.md). The branch is for Claude to inspect and integrate; no merge into the lead branch is performed. The lead’s latest published changes are merged into this contractor preview.

## Interface changes

The farm canvas fills the viewport. A compact translucent HUD shows coins, level/progress, live visitor count, fullscreen and settings. Five consistent navigation choices are Farm, Build, Attractions, Home and More. Wardrobe, Journal and detailed controls remain under More. Stock and total served remain available to the underlying systems without dominating the HUD. The permanent quest strip is hidden; favours remain collectable in Journal and through their existing reward cards.

The Home destination is now the private garden. The actual house opens the existing interiors. Farm buildings use native hit targets and compact context cards; Hollow House offers Enter, Manage and Upgrade. Deep statistics, surface choices and catalogues open only on request. Rooms use a small Back / name / Decorate header. Garden and foyer selection controls appear only while editing, and Done clears the preview. Undo and optional recolours also apply to the existing home furniture editor.

Visitor cards show the same live visitor's intention, money and mood. Farm bubbles are rate-limited and short; foyer speech stops during editing or menus. Routine notifications are brief; meaningful level rewards keep their celebration. Harvest effects are scoped to their originating scene. Switching into a room no longer puts farm reward text over its furniture.

The UI uses cream text, amber accents and charcoal/plum surfaces, restrained borders and 44px targets. Side sheets on wide screens become scrollable bottom sheets on narrow screens. Safe areas, portrait, landscape and Fold-sized viewports are accommodated. This is responsive browser/fullscreen support, not a native Android build.

## Source boundaries and integration risks

- `main.js`: scene navigation, More, context cards, optional editors and HUD count.
- `scene.js`: farm gates/attraction hitboxes and adapters for the separate estate/foyer scenes. Preserve Claude's unpublished fixture and placement work when resolving these hooks.
- `places.js` and `ui/home-sheets.js`: optional saved tint, reversible placement history and explicit Done in the existing editor.
- `style.css`, `index.html`: global HUD, navigation, responsive sheets and compact editor styling. Reconcile any unpublished portrait/layout fixes instead of overwriting them wholesale.
- `model.js`: schema 9 and additive restore defaults; Hollow visitor persistence has to run after normal night-time transient cleanup.
- `rules/selling.js`: the same farm guest takes a Hollow detour. Keep visitor boosts, wallets and earlier cocoa behaviour when reconciling Claude's newer balancing.

The final branch includes Claude’s published fine shop/fixture/shelf/portrait/balance work through `dd97819`. The patch does not alter the root 2D game, delete saves or remove existing outfits/items. It adds no package dependencies and requires no runtime asset fetches. The standalone HTML embeds scripts and assets. Browser WebGL and audio/fullscreen policies still apply, with music starting after a user gesture as before.

## Validation method

Pure rule/controller tests cover restoration gates, pause, five paid tiers, one-charge receipts, returning-guest capacity, crowd drainage, saved paid visits, old saves, inventories, collision rules, side-wall mounting, tint isolation and reversible placement. Native art tests inspect positive finite box transforms across house/foyer tiers and props, and Mortimer's animation states.

Browser QA uses the real standalone HTML in Chromium with SwiftShader, real map ray picks and menu clicks. Money and levels are deliberately staged to reach later content; these runs are interface/function checks, not a claim about natural playtime. Core QA disables bloom/shadows for software-rendering speed, then captures Fold views with both enabled. Phone, unfolded Fold and short landscape sizes are 390×844, 874×787 and 844×390. These are viewport checks, not testing on a physical Z Fold 7.

The final report and exact artifact hash are in the delivery README and verification folder. Failed development runs were used to fix an editing ray-hit priority issue and a malformed starter decor coordinate. A rotation test also found a correctly blocked collision; the final test uses an open position rather than bypassing collision rules.

## Deliberate boundaries

The estate is a full orbitable plot, not first-person avatar movement. The foyer is a playable management/decorating room; the maze journey itself remains an abstract timed visit. The ticket utility desk stays fixed to its service lane, with purchasable visual finishes. The 20-level cooking/research/food-truck system remains a roadmap, not a completed feature. The gameplay review identifies the legacy cocoa migration imbalance; this package does not silently rebalance Claude's economy or recalculate old levels.
