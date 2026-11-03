# Achievements — The Hollow Ledger

**Plan and interaction concept only.** This pack does not add achievements to the playable game or change its save format. It proposes an original, premium achievement layer using the familiar short celebration/detail flow of console achievements, with Pumpkin Patch's purple, amber and cream visual language.

Reviewed source: contractor `87714df8a6e3f158ce3e6e6279f14777e5749954`, including boost/helping-hands implementation `2b50fa37a58b8c87132b290fc2bfc0af79f852c6`, based on lead `f2f96f8351dea4cf6072862b1e3e0b14d6a318dc`. Claude must check its latest integrated head before implementing. In particular, thermal/helper achievements require the new contractor mechanics or equivalent lead changes.

## 1. What the player gets

A meaningful action unlocks a compact animated achievement pill. The player can tap it to see exactly what they did, their permanent badge and points. If they let it fade, the achievement stays in a browsable library with a New marker. There is no claim timer and no loss from closing the toast.

The launch volume contains **64 achievements worth 1,000 Haunt Score**:

| Group | Count | Points per achievement | Total | Purpose |
| --- | --- | --- | --- | --- |
| Early | 16 | 5 | 80 | Teach the verbs and reward the first few meaningful sessions |
| Mid | 20 | 15 | 300 | Connect the house, kitchen, guests, shops and attractions |
| Late | 16 | 25 | 400 | Give the established farm skill, collection and mastery goals |
| Secrets | 12 | Ten at 15; two at 35 | 220 | Reward curious, deliberate discoveries with helpful optional clues |

Haunt Score is a lifetime collection score, not currency, level XP, a visitor buff or a spendable resource. It does not create another economy. The score is derived from immutable unlocked IDs in this fixed volume; players cannot spend or lose it. New expansions get separate volumes rather than changing the finish line of this one.

Phases describe the likely point in play, not a lock on recognition. If someone genuinely completes a later goal early, award it. UI filters use the phase plus activity category; the label Rare is an authored challenge classification, not an invented worldwide completion percentage.

## 2. The unlock moment

**Appearance.** A dark plum pill with a subtle opaque backing, a sculpted circular badge at the left, warm cream type, a small amber points tag and a restrained mint confirmation ring. No Xbox logo, green platform shell or copied sound. Names stay short enough for two lines on a 390-pixel phone. The entire main body is a button; its separate close button is at least 44 pixels and cannot also open details.

**Motion.** About 260 ms for the badge to settle and pill to reveal, a single fine sparkle sweep around the edge, then a calm hold. A rare unlock gets one additional moth/light glint and a deeper note, not a larger blocking panel. Allow 5.4 seconds of readable dwell after entry, then a 220 ms fade. Hover, keyboard focus or a screen reader interaction holds dismissal. Reduced motion shows the finished state with a short fade and no sweep/scale.

**Sound.** A short original three-note celesta/chime motif with a soft low confirmation tone, about 0.7 seconds. Secret/legendary adds a restrained fourth note. Use the existing sound preference and separate achievement-sound toggle; respect mute and do not play audio before browser gesture consent. Haptics are one optional light pulse, never a scare-strength rumble.

**Placement.** Use one notification safe lane, normally centred below the compact top HUD. Maximum width 360 px desktop; phone width at most viewport minus safe areas and 24 px. The lane must avoid favours/NPC reward cards and live controls. It may move to a measured free edge on unusual aspect ratios; it never covers the thumbsticks or Interact target. Test the actual HUD rectangles, not a fixed top offset alone.

**Input.** The toast never steals character or camera focus. Touch/mouse opens it directly. Keyboard users can Tab to its Open button; Enter opens the focused toast. Controllers use the existing Options hub's Achievements/Latest unlock entry and normal menu confirmation; do not repurpose gameplay X or a direction that already controls tools. Opening details uses the ordinary menu boundary, blocks world input and restores focus safely on close.

## 3. “What you did” details

Each unlock writes its evidence before any animation. The detail view shows:

- Badge, name, phase, challenge tag and points.
- The exact criterion in clear language.
- **What you did:** a snapshot of the qualifying totals, owned item IDs or completed action sequence, including the owner/source when relevant.
- Date recognised and active-game time. Imported achievements say **Recognised from existing progress**, never an invented historic date.
- Cosmetic reward status and an Open library action.

For example, an owner-work badge should say “Natalie manually completed 25 watering actions” if that is the recorded feat; it must not reinterpret all helpers' historical watering as Natalie's. A home badge retains its furnished-room snapshot after the player stores the furniture. The preview's example evidence is clearly sample data and never becomes production receipts.

Locked details show current/target, prerequisites, and a helpful **Go to** destination when it exists: Farm upgrades, Kitchen, Wardrobe, Home or an attraction's management sheet. Required level means “this activity becomes available here”, not an extra achievement fee. Never advertise the unimplemented village as an available destination.

## 4. Achievement library

Primary entry: **More → Achievements**, with a secondary link from Journal/Scrapbook and the controller hub. Avoid squeezing another equally weighted tab into the existing four-tab Journal. Preserve Favours as their paid, manually claimed requests; Memories remain the personal scrapbook.

The library opens on demand. Its header shows earned count, Haunt Score and a compact completion bar. A Next up strip offers at most three relevant attainable goals. Main filters are All / Early / Mid / Late / Secrets; status is All / Earned / In progress; search matches revealed names and descriptions. Recently earned is the default sort, with Near completion and Category available. Use one/two columns according to the panel's actual width, not only the device width.

Cards show one icon, title, score, short criterion and a progress line. Completed cards are readable cream/plum with a small earned mark, not washed-out grey. A selected card opens one detail panel with a predictable Back action; no chains of nested pop-ups. Keep filter and scroll position when returning.

**Secrets.** Locked secret titles, art and exact criteria remain concealed by default. Show a crafted first clue and the 15/35-point value. Reveal hint opens a stronger clue; Reveal solution requires an explicit spoiler confirmation and changes only presentation. No point penalty, random roll or missable calendar window. Search and accessibility labels must not leak concealed titles. Awarding a secret reveals its full entry and precise evidence.

The catalogue excludes unavoidable purchase-only grinds, real midnight logins, date-exclusive rewards, compulsory unskippable horror tours, intentional bad treatment of guests, random tip-quality gates, fresh-save no-spend missables and disability/control-mode restrictions. Rare means worth discovering, not something that requires luck or inaccessible dexterity.

## 5. Toast scheduling and existing celebrations

Only one achievement toast is visible. Gameplay never pauses merely because one unlocks. Arbitration priority is: urgent transaction/control feedback → current cinematic/scare/input ownership → level celebration → achievement → routine notice. Delay the toast during intro, a scare ride, carving, furniture dragging/rotation, purchase hold, a modal, a held tool, a paused game or a hidden document. Reward receipts still commit while presentation waits.

Do not let an NPC reward expire behind the achievement pill: defer the achievement or suspend the NPC reward's remaining display time according to one shared lane coordinator. A level-up and achievement for reaching the same level resolve their awards once, show the level card first, then one compact achievement.

Coalesce more than three unlocks in ten active seconds into “3 achievements unlocked · View”. All individual receipts and New markers remain in the library. A migration backlog shows a single quiet summary on the next safe visit, with no replay of 17 old jingles. Presentation state records seen/acknowledged separately from earned/reward state. Cap the visual queue, not the earned collection; a hidden tab cannot create an endless burst later.

Where a new achievement overlaps an existing Memory, keep the memory ID and scrapbook entry but let the achievement own that moment's toast. Existing Favour rewards retain their normal rules; the achievement adds no second coin payment. A shared accomplishment mapping makes this intentional, not accidental duplicate evaluation.

## 6. Rewards that fit the game

Every achievement grants its badge and listed Haunt Score automatically. Launch achievements grant no recurring income bonus and no coin/XP loop. Optional collection rewards are a small, authored cosmetic set:

| Fixed milestone | Proposed cosmetic | Production dependency |
| --- | --- | --- |
| All 16 Early entries | Copper First Glow wall plaque | One wall model/icon, universal wall anchoring |
| All 20 Mid entries | Moth-trim trophy shelf | Shelf model, measured sockets and collision |
| All 16 Late entries | Gothic accomplishment display cabinet | Model, furniture bounds and shelf sockets |
| All 12 Secrets | Iridescent moth-glass wall panel | Lightweight material/model with reduced-glow option |
| Full base volume, 1,000 score | Masters of the Hollow journal seal/title | UI cosmetic; no new gameplay multiplier |

These are proposed new assets, not existing catalogue items or already granted rewards. Final IDs/models must exist before reward definitions ship. Cosmetics already owned remain owned; never replace them with farm-income rewards. Track collection rewards with stable, once-only claim IDs independently from the achievement receipts.

## 7. Evidence and save architecture

Keep definitions, eligibility and awards in pure rules. UI reads immutable receipts and progress snapshots. Proposed modules are `content/achievements.js`, `rules/achievement-stats.js`, `rules/achievements.js`, `ui/achievement-toast.js`, `ui/achievement-library.js` and a small notification coordinator. This plan's `catalogue.json` is design data, not a drop-in runtime module.

Use existing saved totals only with their actual meaning. `harvested` includes big-pumpkin gifts and helpers; `sold` is served pumpkin customers; total cooked batches combines stations and chefs. Page indices do not prove all pages viewed, a pet pose does not prove completed interaction, and short sale/carving histories do not prove lifetime collections. The accompanying evidence audit identifies the necessary new source-qualified counters and committed events.

Events need stable transaction/action IDs, owner, source and game time. A cooking-complete event needs job/batch/station/automatic provenance; a crop action needs crop identity, distinct plot IDs and manual/helper source. Observe the existing money/stock transaction, never charge or sell twice just to count an achievement. Record bounded sets/counters; do not save the entire event stream.

Proposed saved namespace: `achievements = { catalogueVersion, stats, attempts, unlocked, collectionRewards, presentation }`. Each unlocked ID has a definition revision, recognition/import time, evidence summary and once-only award receipt. Earned status never reverses after a sale, outfit change or balance update. Receipts survive a dismissed toast and a reload before viewing details.

Migration uses the next unused schema version after Claude integrates its current work; the inspected contractor build is version 15. Backfill provable totals, ownership/configuration and matching Memory IDs quietly. Newly measured owner/manual/sequence stats start at zero with **Tracked since this update**. Do not fabricate old actions. Definitions have frozen base recipe/costume/shape ID sets, so adding DLC does not silently move completion targets. Reject unknown IDs, duplicate grants and invalid counters on restoration.

Obscure sequence attempts use active-game time and durable stage/baseline state, not wall-clock dates or a requirement to keep one browser session alive. Failed attempts explain the reset; reload resumes the same attempt rather than rerolling it. Cosmetic rewards cannot recursively earn economic/progression achievements.

## 8. Delivery phases and acceptance

1. **Catalogue and evidence:** finalise all 64 criteria, frozen ID sets, points, Memory aliases and missing counters. Validate totals, uniqueness and absence of circular prerequisites.
2. **Foundation:** receipt/save migration and committed-event stats; first 16 Early goals; reconcile one example from each source, no UI awards.
3. **Unlock UI:** toast, exact details and library; click/keyboard/pad back flow; notification priorities and accessibility.
4. **Mid/late/secrets:** wire the remaining sources and deterministic attempts, then cosmetic collection rewards once their assets exist.
5. **Whole-game verification:** old/new saves, once-only grants, background simulation, all twenty levels, recipe/stock/purse economics, controller and folded/unfolded layouts.

Acceptance includes a true end-to-end unlock in each domain, rejected/cancelled actions not counting, reload before/after toast, duplicate event delivery, retro-import without fake dates, multi-unlock coalescing, point total of 1,000, locked-secret search/accessibility privacy, hint reveal without award, no forced focus, no blocked thumb controls, reduced motion/audio mute, missing reward-asset protection and a maximum-size library without frame-time regressions. The achievement system must not iterate 64 complex predicates every rendered frame; evaluate relevant dirty domains and committed event batches.

The Mothlight Village remains a separate planned expansion. Reserve a future achievement volume for residents, resource collecting, home building and puzzles, excluded from this base volume until those features genuinely ship.
