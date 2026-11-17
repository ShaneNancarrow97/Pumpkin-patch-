# Illustrated level rewards and clear requirements

Contractor patch, November 2026. This is presentation work on the existing level system; Claude remains the main game owner.

## Player flow

Tapping the HUD level badge opens **requirements first**: current → next level, actual farm earnings against the next threshold, an earnings bar, and the existing exact home/village checklist. Every checklist row says **Met** or **Still needed**. Reward bonus coins are explicitly excluded from earnings, matching the rules.

A home blocker offers **Visit home**. The level-four village invitation offers **Visit village**, using the first unmet requirement's action, rather than sending the player home. These close the preview before navigation and cannot claim rewards or buy anything. At maximum level, tapping the badge opens the existing full progression library.

A newly earned level opens a reward receipt with a rank illustration and a collection of trading-style cards. The first cards show gifts the rules have **already granted**; following cards explain level-gated purchase opportunities, with their price, menu destination and prerequisites. Buying a business, restoring the Hollow House, researching a recipe, or buying previous upgrade tiers remains a separate action in its normal menu. Duplicate gift receipts show the actual £50/£100 replacement coins.

Players can browse with previous/next, horizontal touch swipes, keyboard Left/Right/Home/End, or the existing controller L1/R1 tab handling. There is no autoplay. The current card and position dots stay in sync. **Keep growing** closes the receipt; **All 20 levels** opens the existing library. The primary action stays outside the scrolling content so a phone landscape or TV viewport can always leave the receipt.

## Integration and ownership

- `src/ui/level-celebration.js`: modal, requirement checklist, carousel, inert/focus boundary and input.
- `src/ui/level-reward-cards.js`: pure, read-only gift/unlock/requirement presenters and bounded carousel state.
- `src/ui/level-rewards.css`: scoped to `#level-celebration`; load after `village-menu-refinement.css`. Does not style the farm HUD.
- `src/ui/level-reward-icon-markup.js`: illustrated rank/category markup from the art contractor.
- `src/ui/level-reward-icons.js`: call `installLevelRewardArt()` once before constructing game UI; uses one shared atlas/style.
- `createLevelCelebration` retains `tick`, `preview`, `active`, `rewardRow`, `dispose`. Optional `openHome` and `openVillage` callbacks navigate after a read-only preview closes.
- The read-only `status` getter exposes `{mode, level, cardIndex, cardCount}` for QA. Modes are `requirements`, `celebration`, or `null`.

Parent integration owns the HUD badge, original accessible level text, callback wiring, CSS build list and diagnostic exposure. No rule, threshold, economy, purchase, persistence, progression or save migration changes are included here.

## Input and presentation dependencies

The carousel tab row has `data-pad-tabs`, real `role=tab` controls, and synchronised `aria-selected` and `aria-pressed`. This satisfies both village and generic farm controller menu handlers. It does not add another gamepad poller or duplicate Cross activation. Each target is at least 44px; all explanatory text is at least 12px. Only one card is visible at a time. Horizontal swipes require 40px movement that is clearly more horizontal than vertical; ordinary vertical reading keeps the card unchanged.

The existing finite confetti and level-up audio remain, only on actual celebrations. Preview is silent. Reduced-motion preferences suppress confetti. Screen content behind the modal is inert and restored on close. Session tokens prevent detached callbacks from dismissing a later queued receipt or opening a second destination.

Model dependencies: `LEVELS`, `patchLevel`, `homeRequirements`, `dismissLevel`; real level unlock tables and cost helpers for farm, visitor, shop, house, helpers, boost, cocoa, Hollow House/foyer, hayride, kitchen, recipes and visitor occasions. A future purchase family should be added to the read-only card presenter when it gets a new level gate. A catalogue change does not automatically grant it.

## Validation

`node --test test/level-rewards-ui.test.mjs test/levels-and-visitors.test.mjs`

Focused coverage checks all 20 level collections, real prices and purchase wording, frozen-state read-only rendering, actual duplicate receipts, exclusion of bonus XP, exact home blockers, reward navigation bounds, pointer/keyboard callbacks, pad tab semantics, one visible card, one-time receipt dismissal, stale callback rejection, focus/inert restoration, blocked overlay sequencing, maximum-level library routing, and home/village navigation without spending or claiming.

Parent QA covers the actual bundled HTML, transparent illustrated art, phone/Fold/TV layout, touch swipe and Bluetooth controller integration. The contractor did not run a browser, build, commit or push independently, to avoid conflicting with the parent integration.
