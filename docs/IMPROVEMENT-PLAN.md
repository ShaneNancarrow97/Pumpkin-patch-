# Shane & Natalie’s Pumpkin Patch: Review and Improvement Plan

*Basis: a static review of Pumpkin\_Patch\_Midnight.apk (v2.10.0): the Android shell, the bundled game code and the embedded assets. I could not run the game, so every balance number below is an estimate from reading the code, and the screens were not reviewed visually. Workstream B begins with a simulator so these estimates get replaced by measurements.*

## 1. Summary

The game is a cozy Halloween pumpkin-farm and shop sim starring Shane and Natalie. It is unusually well engineered for a hobby project: modular source, a validated and versioned save format, a real customer and inventory model, a decoratable four-room house, 15 costume entries and a story library.

Its weakness is shape, not polish. Plot output far exceeds what customers can buy, and the shop has a single till, so several upgrades barely change income. The progress meter finishes at £1,000 earned while about £131k of content remains to buy, and probably all of it can be bought in well under ten hours. Nothing pulls you back after you close the app, and the house and wardrobe feed nothing back into play. The save is also exposed: Android auto-backup is off, so a reinstall or a new phone loses progress unless a manual export was made.

**The plan, in order**

1. Protect the save, then build a headless economy simulator.
2. Rebalance around the real bottlenecks and stretch the goal ladder across all content.
3. Add real decisions: pricing, reputation, crop traits, better displays.
4. Turn the five named guests into regulars with stories, and let the house matter.
5. Add gentle return hooks: welcome-back earnings, nightly goals, seasons, an optional New Season.
6. Polish audio, tap interaction, accessibility and load time.

Every step keeps the cozy, no-fail tone.

## 2. What the APK is

| Item | Finding |
| --- | --- |
| App | com.shanenatalie.pumpkinpatch v2.10.0 (code 21001), minSdk 26, targetSdk 35 |
| Permissions | None requested. The game is fully offline. |
| Shell | One Activity hosting a WebView; a native BackupBridge uses the system document picker for backup export and import |
| Load path | Files are served from https://appassets.androidplatform.net/ (index.html, android-shell.js). Saves live in that origin’s localStorage, so changing the origin would orphan existing saves. |
| Android flags | allowBackup=false, cleartext traffic off, hardware acceleration on, resizable activity |
| Game file | assets/index.html is 27.8 MB in one file: about 0.46 MB of CSS and JS, 26 MB of base64 WebP (163 embedded images, 138 unique), a 1.2 MB base64 mp3 and a 0.2 MB font. Unique decoded media is about 19 MB; duplicates waste about 2.1 MB of text. |
| Source | The bundle header says it is generated from src/main.js by npm run build. Modules are split into content, core, scene, ui and platform; the largest are app/game.js (60 KB) and ui/house-ui.js (33 KB). |
| Two targets | The shell notes that the browser release remains unchanged, and the startup text tells browser users to open the downloaded file in Safari or Chrome. So a single-file browser build exists beside the APK, which probably explains the inline base64. |
| Save | localStorage key sn-pumpkin-patch-halloween-v2, schema version 9, migrations from v1, a retained pre-v9 copy, strict validation |

## 3. What to protect

- The voice: warm, dry, British, and the Shane and Natalie banter (naming a pumpkin Kevin, a loyalty card, fairy lights down the path, a hot chocolate stand, Skyla the cat ringing the bell). Several of these are ready-made feature seeds.
- No fail states, no timers that punish, a pause (“Take a tea break”).
- Zero permissions and fully offline.
- The pure core: model, shop, stall, inventory, commands and clock contain no UI, which makes a simulator and tests cheap.
- The save discipline: versioned schema, migrations, a retained copy, in-game backup.
- The content system: costumes already carry a collection tag, rooms and styles are data, books unlock library stories.
- Reduced-motion handling and aria labels already exist.

## 4. Findings

| ID | Impact | Finding | Evidence |
| --- | --- | --- | --- |
| F1 | High | The shop has one till, so capacity upgrades add little | Only one customer is in the paying phase at a time; checkout takes 12, 10 or 8 s by level. Customers spend 3 s entering and 4 s browsing, so capacity 2 already keeps the till busy at 8 s. The capacity upgrades beyond 2 (£3,200 and £9,500) only lengthen the queue. |
| F2 | High | Production far exceeds demand | Fully upgraded, 12 plots at 6.7 s growth and 6 pumpkins per harvest make about 10.7 pumpkins/s. The shop sells at most one basket (up to 3 items) per 8 s, and the stall gets a visitor every 17.5 to 24 s. Even at the start, 6 plots can outproduce the stall. Watering-can and extra-yield upgrades (£14,745) and tapping therefore have little income effect. |
| F3 | High | The goal ladder ends at £1,000 | Four levels, the last at £1,000 earned. Total purchasable content is about £131k. |
| F4 | High | Saves are fragile | allowBackup is false; decodeSave returns null if any field fails validation; export is manual only. |
| F5 | Medium | No reason to return | The game pauses when backgrounded; there is no offline progress, no daily hook, 10 one-off favours (£490 of rewards in total) and 6 achievements. |
| F6 | Medium | Home and wardrobe are cosmetic | The haunting score only gates one favour. Costumes only gate one favour. About £21k of sinks give nothing back. |
| F7 | Medium | Few decisions | Prices are fixed per variety, there are 4 varieties, the helper automates the only active task, and customers are 6 fixed profiles. |
| F8 | Medium | Tapping is thin | Each tap adds 1.5 s of growth to every growing plot; with nothing growing, every 8th tap yields a pumpkin. The streak bonus is £5 per 6 harvests with a 60 s cooldown, against pumpkins worth £12 to £70. |
| F9 | Medium | Heavy single file | 27.8 MB parsed as one document; base64 adds a third; 20 groups of duplicate images. |
| F10 | Low | Thin writing and audio | 15 banter lines, 10 books, 5 guests, 1 music track plus synthesized sine blips. |
| F11 | Low | Accessibility gaps likely | Reduced motion and 64 aria labels exist; I found no text-size, contrast or colour-blind options (not exhaustively verified). |

## 5. Economy analysis

### 5.1 Where the money goes

| Sink | Total (£) | Feeds back into play? |
| --- | --- | --- |
| Plot variety upgrades (12 plots × 180 + 900 + 3,600) | 56,160 | Yes: higher prices |
| Shop upgrades (open 600; capacity 900, 3,200, 9,500; displays 1,200; checkout 1,800, 5,200) | 22,400 | Partly: see F1 |
| Farm upgrades (watering can 8,428; extra yield 6,317; helper 500; plots 960; signs 3,216) | 19,421 | Partly: see F2 |
| House expansions | 12,250 | Unlocks rooms |
| Furniture, decor, wallpapers, books | 8,437 | No |
| Room styles | 6,300 | No |
| Costumes | 6,520 | No |
| **Total** | **131,488** |  |

### 5.2 Throughput (estimates)

| Stage | Production | Demand | Result |
| --- | --- | --- | --- |
| Start: 6 plots, no upgrades, stall only | about 0.27/s if replanted | 1 visitor per 24 s buying 1 to 2: about 0.04 to 0.08/s | Stock piles up unsold |
| Mid: 9 plots, watering can 3, yield 2, shop at capacity 4 and checkout 10 s | about 2.2/s | up to 0.1 baskets/s, so about 0.2 items/s, plus the stall | Large surplus |
| Late: 12 plots, all upgrades | about 10.7/s | one basket per 8 s (about 0.25 to 0.4 items/s) plus the stall | Surplus of about 25× |

With every variety stocked and displayed, I estimate an average shop basket of about £71 and an average stall sale of about £52. That gives a ceiling of roughly £530 per minute from the shop and £180 per minute from the stall, about £700 per minute combined. At that rate the entire £131k takes about three hours of ceiling income, so a realistic first playthrough is probably under ten hours including ramp-up.

### 5.3 Implications

- The real progression levers today are plot variety, signs (arrival rate), checkout speed and display slots. The watering can, extra yield, shop capacity beyond 2 and tapping are largely filler.
- Either make production matter (shelf space, perishable stock, quality) or make demand matter (more tills, reputation, pricing), ideally both.
- Total content must grow, and costs must be re-scaled so a full playthrough lasts roughly 25 to 30 hours before any New Season.

## 6. Vision

**One line:** a cozy night-market sim where your choices decide who turns up, and the people who turn up become the story.

**Pillars**

1. **Gentle decisions.** What to grow, what to charge, what to feature. Never a way to lose.
2. **People over numbers.** Named regulars with preferences, friendships and short stories.
3. **A home that answers back.** Decorating and costumes change how the night feels and who visits.
4. **Always something small to look forward to.** A welcome-back basket, tonight’s three wishes, a seasonal event.
5. **Warm and personal.** The humour and details that make it Shane and Natalie’s.

**Session shape.** A two-minute check-in (collect the welcome-back basket, claim tonight’s goals, restock, feature a pumpkin) or a thirty-minute evening (chase a regular’s story, redecorate, plan the next upgrade).

**Core loop.** Grow, choose stock and price, serve visitors, earn coins and reputation, spend on upgrades, home and wardrobe, which unlock people and events, which bring new demand.

## 7. Workstreams

### A. Save safety and data

- Keep three rolling autosave snapshots (second localStorage key or IndexedDB), refreshed every 10 minutes and after big purchases.
- Make restore tolerant: repair a bad field to its default and report it, rather than discarding the whole save. Keep the strict validator for imports, with a repair report.
- Show “last backup” in settings, with a gentle reminder after 7 days or after a large amount earned since the last export.
- Add a copy-and-paste transfer code so progress can move between the browser build and the APK.
- Evaluate Android Auto Backup with data-extraction rules. Test with adb that WebView storage really restores before relying on it; keep manual export regardless.
- Introduce schema v10 with migration tests from fixtures of v1 to v9.
- **Done when:** a fixture with one corrupted field still loads with that field repaired, and an uninstall and reinstall restores from an export in under a minute.

### B. Simulator and rebalance

- Run the core modules in Node with scripted players (lazy, steady, optimal) and output income per minute, time to each milestone, till utilisation, unsold stock and an upgrade report showing income gained per £ spent.
- Candidate fixes, to be chosen with data:
  1. Make capacity matter by adding a second till, or a helper at the till, as an upgrade.
  2. Cap shelf space so surplus production is wasted, which makes growth and yield matter up to the shelf limit.
  3. Let queued customers wander off gently (“left a sweet note”) after about 25 s, so queue length and till speed both matter.
  4. Repurpose watering can and yield into quality and variety effects, or lower their cost and level count.
- Re-scale costs after new content lands so pacing hits §9.
- **Done when:** every upgrade shows a measurable effect in the simulator and the pacing table is met within about 15%.

### C. Goal ladder and onboarding

- Replace the 4 levels with about 25 titled levels spanning the whole economy, each with a small cosmetic reward, a banter line or a Skyla trick.
- Show a rolling “next three goals” drawn from shop, house, wardrobe, favours and regulars.
- Turn the Journal into a completion tracker (varieties, regulars, rooms, costumes, books, stories) with a percentage.
- Surface stats the game already records (visitors who left because of budget or because stock ran out) as friendly hints.
- Verify that the first two minutes guide plant, harvest and first sale without needing the help modal.

### D. Decisions: pricing, reputation, crops, displays

- **Pricing dial** per variety, plus or minus 30% in 5% steps (Fair, Cheeky, Greedy). Each profile has a tolerance; above it they leave without buying, below it reputation rises.
- **Reputation** (shown as lantern glow, 30 to 100): rises with fair prices, stocked displays and served regulars; raises arrival rate up to ×1.4 and replaces part of the linear signs upgrade. It never drops below 30, so there is no punishment spiral.
- **Crop traits:** Moonlight sells better on moon nights; Witchfire buyers tip; Starlight has a double-yield chance.
- **New varieties (starting ideas):** Jack-be-little (12 s growth, three fit in one basket slot), Ghost pumpkin (sells to ghosts at +50%), Candy-corn (bundle partner), Giant (slow, trophy only).
- **Displays:** a featured window slot gives +20% appeal; seasonal bundles such as “A pair for the porch”.
- **Banter seeds to build:** name one pumpkin per night to keep on a “pumpkin family” shelf at home (Kevin); a loyalty card rewarding a regular with a larger pumpkin after nine purchases; a fairy-light path that adds reputation; a hot chocolate stand as a second product line unlocking around the third level.
- **Done when:** a simulator run shows at least three distinct strategies reach milestones within 25% of each other.

### E. People: regulars and story

- Promote the five existing guests (Pip the ghost, Mabel the witch, Count Bram, Bones the bookworm, Patch the scarecrow) to regulars with five friendship levels, a favourite variety, a visiting rhythm and a four-chapter story.
- Each chapter: one request (stock something, decorate something, wear something), a 3 to 6 line scene, and a keepsake or small perk.
- After friendship 2, regulars can visit the parlour and react to decor tags (cosy, spooky, bookish, glam).
- Grow the six customer profiles to about twelve with tiny names and lines.
- Expand banter from 15 to about 80 contextual lines keyed to events: first sale, sold out, new costume, new room, regular arrives.
- Give Skyla more behaviours and a few hidden moments.

### F. Home and wardrobe feedback

- Convert the haunting score into atmosphere tiers (0 to 11, 12 to 29, 30 to 59, 60 and over). Bonuses are small and capped (for example up to +15% arrivals) and unlock events and story chapters, so decorating is never a chore.
- Use the existing costume collection tag: matching outfits for both characters give a duo bonus; item collections (a library set) give small rewards.
- Add a showcase view for sharing a picture of the house.
- Add rooms and items through data catalogs; candidates are a porch with the fairy-light path and a greenhouse.

### G. Return hooks

- **Welcome back:** after at least 10 minutes away, Skyla minded the stall. Grant up to 4 hours of away time at about 40% of current income, shown as a receipt. Reuse the simulation clock with coarse steps and make sure it cannot double count with pause.
- **Tonight at the patch:** three small goals per night with small rewards; progress accumulates as fireflies and nothing is ever lost.
- **Market Night:** a weekly special request from a regular, tied to the device date.
- **Seasons:** Halloween stays the default; Bonfire Night, midwinter and spring are optional themed events with reskins and a few items.
- **New Season (optional prestige):** available around £50k earned. It resets farm and shop levels and coins, keeps the house, wardrobe, journal and friendships, and grants Moon Seeds for permanent perks. Each season has a light modifier. The first playthrough is complete without it.

### H. Interaction and feel

- Make tapping meaningful after the helper: tending a plot gives a quality star (+20% price) the helper cannot give; a golden pumpkin occasionally appears for six seconds; a glow meter fills with tending and triggers a 20-second Moonbloom boost.
- Add optional haptics. Vibration needs a permission the app does not have today, so make it a deliberate choice.
- Add squash and stretch, coin arcs, a ripe-pop sound and varied sale chimes. When there is nothing to do, show a gentle hint instead of a dead tap.

### I. Audio and presentation

- Current: one music track and synthesized blips.
- Add: three tracks (patch, shop night, house) with crossfades, a proper SFX set, ambience (crickets, wind, owl), ducking during dialogue and separate volume buses.
- Tie the sky to the night counter with moon phases and occasional weather.
- Confirm the licence of the existing and any new tracks before sharing beyond family and friends.

### J. Performance and build

- Build two outputs from one source: the APK serves real files from assets through the same appassets origin (so saves survive), with images lazy-loaded per screen; the browser build stays a single inlined file for easy sharing.
- Deduplicate the 20 duplicate groups, right-size the largest room backgrounds (several are 400 to 700 KB each), and atlas the small icons.
- Budget: first screen under 3 MB, cold start under 2 seconds on a mid-range phone; the build script fails if the first-screen payload exceeds the budget.
- Ship music as a real file, not base64.

### K. Accessibility and text

- Add a text-size setting, a high-contrast mode, colour-blind-safe plot states (shape or label as well as colour), 48 dp touch targets and an in-game reduce-motion toggle.
- Announce toasts and sales to screen readers where not already done.
- Keep UK English; move strings into a table if translation is ever wanted.

### L. Code health and tooling

- Local-only tooling: npm scripts, node:test unit tests for the core, golden-save fixtures for v1 to v9; no hosted repository or CI is assumed.
- Split game.js and house-ui.js into feature modules as people, events and seasons arrive.
- Keep content data-driven (regulars, events, items) so adding content does not touch logic.
- Add a local debug panel showing simulator-style stats.

## 8. Roadmap

Effort is relative: S about an evening, M a few evenings, L a couple of weekends, XL several weekends.

| Release | Theme | Scope | Effort |
| --- | --- | --- | --- |
| v2.11 “Lantern” | Foundation | A (save safety), B (simulator and first rebalance), C (ladder), J (dedupe, dual build), welcome-back from G | M to L |
| v2.12 “Night Market” | Decisions | D (pricing, reputation, two new crops, displays), rebalance | L |
| v3.0 “Neighbours” | People | E (regulars and stories), F (atmosphere and collections) | L to XL |
| v3.1 “Seasons” | Return | Rest of G (nightly goals, Market Night, seasons, New Season) | L |
| v3.2 “Polish” | Feel | H, I, K, rest of L | M to L |

Dependencies: A and B come first; D needs B; E needs C. Each release must be fully playable and safe to update from the previous one.

## 9. Pacing targets (proposed starting values)

| Milestone | Target active play |
| --- | --- |
| First sale | under 2 minutes |
| First favour claimed | about 5 minutes |
| Helping hands | about 20 minutes |
| Shop opens | 40 to 60 minutes |
| Second regular befriended | about 2 hours |
| House level 2 | about 3 hours |
| First New Season available | 8 to 10 hours |
| All launch content seen | 25 to 30 hours |

This implies total purchasable content of roughly £600k to £1M after new content, versus about £131k today; the simulator sets the exact scale.

## 10. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Losing saves during a schema change | Fixtures, rolling snapshots, tolerant restore, export before updating |
| Changing the WebView origin orphans saves | Keep the appassets origin; if it ever changes, ship export and import first |
| Scope creep | Ship by release; each release stands alone |
| Balance regressions | Simulator thresholds run before every build |
| Over-gamifying a cozy game | No fail states, capped offline earnings, no streak penalties, all hooks optional |
| Prestige confusion | Opt-in, with a preview of what resets and what stays |
| Asset weight growth | Performance budget and lazy loading |
| Inconsistent new art or audio | Decide the asset pipeline up front (see §11) |
| Licensing if shared widely | Check the music and fonts first |

## 11. Decisions needed

1. Do you still have the src project that npm run build produces this from? If yes I extend it; if not, I reconstruct a source tree from the bundle, which is workable but messier.
2. Is the audience just you and Natalie, or will it be shared publicly? This affects licensing and content.
3. Which platforms matter: Android only, or Android plus the browser file on iPhone?
4. How were the 138 images and the music made, so new content matches the style?
5. Do you want a reset-style New Season at all?
6. Are events tied to the device date acceptable?

## 12. Testing and measurement

- Simulator regression suite plus golden-save fixtures on every build.
- Device matrix: one older Android 8 or 9 phone and one current phone; record WebView version and cold-start time.
- A 30-minute soak test for memory growth; rotation and split-screen checks (the activity is resizable).
- A backup and restore drill each release.
- Three ten-minute playtests with someone new, noting where they hesitate.

## Appendix: current content inventory

- 4 pumpkin varieties (£12, £24, £42, £70); 12 plots; 5 farm upgrade lines; a shop with 4 upgrade lines and a single till.
- 6 stall profiles and 6 shop profiles; 5 customer models (ghost, witch, vampire, skeleton, scarecrow).
- House: 4 rooms (parlour, bedroom, kitchen, attic), 4 parlour interiors, 6 room styles, 16 furniture, 16 decor, 8 wallpapers, 10 books with a story library.
- Wardrobe: 15 costume entries (13 purchasable), one collection (90s-horror).
- 10 favours from 5 guests, 6 achievements, 4 levels, 15 banter lines, the cat Skyla.
- Audio: one music track and synthesized blips.
