# Development plan

This is the working plan for the game in this repository: Midnight 2.10, recovered source. It merges [IMPROVEMENT-PLAN.md](IMPROVEMENT-PLAN.md) (workstreams A–L), [ROADMAP.md](ROADMAP.md) (milestones B0–B6) and the measured findings in [REVIEW.md](REVIEW.md) into one order of work. Each phase ships as a playable release that is safe to install over the one before.

## Ground rules

1. **Saves are sacred.** Never change the save key or the Android origin. Every save-format change comes with a migration and a real fixture in `test/fixtures/`.
2. **Measure, then tune.** Every balance change includes `npm run sim` output from before and after, in the pull request.
3. **Cosy, never punishing.** No fail states and no streak penalties. Away rewards are capped, and every hook is optional.
4. **One offline file.** The release still opens from a phone's Downloads folder with no network.
5. **Small pull requests.** Each one is green on CI, with `npm run check` passing.

## Version and schema numbering

The lost releases 2.11–2.16 used save schemas 10–13, and a phone that ran 2.16 still holds a schema 13 save. To keep this code from ever misreading one of those saves, this line of development:

- **numbers its releases from 3.0**, so they can't be confused with the lost 2.11–2.16
- **jumps straight to save schema 20** the first time it changes the save format, keeping 10–19 for the lost builds
- **rejects schema 10–19 saves** with an explanation, and keeps them intact. A later importer can convert them if the 2.16 source is ever recovered.

## Phases

| Phase | Release | Theme | Main sources | Size |
| --- | --- | --- | --- | --- |
| 0 | — | Foundation: source recovery, build, tests, simulator, CI | — | **done** |
| 1 | 3.0 "Lantern" | Save safety and versioning | Plan A, Review R1/R2/R5 | M |
| 2 | 3.1 "Night Market" | Demand and balance | Plan B, Roadmap B1/B2, Review §3 | L |
| 3 | 3.2 "Signposts" | Goals, onboarding, journal | Plan C, Roadmap B3 | M |
| 4 | 3.3 "Market Choices" | Pricing, reputation, crop traits, displays | Plan D, Roadmap B3 | L |
| 5 | 4.0 "Neighbours" | Regulars, stories, a home that matters | Plan E/F, Roadmap B4/B5 | XL |
| 6 | 4.1 "Seasons" | Welcome back, nightly goals, events, New Season | Plan G, Roadmap B6 | L |
| 7 | 4.2 "Polish" | Feel, audio, accessibility, size, code health, Android | Plan H–L, Review R3/R4/R6/R7 | L |

Sizes are relative: S is an evening, M a few evenings, L a couple of weekends, XL several weekends.

### Phase 1: 3.0 "Lantern", save safety (in progress)

- [x] The game version is shown in Settings and written into backups (`gameVersion`).
- [x] **Tolerant restore.** A damaged section of a save is repaired to a safe value instead of discarding the whole patch. The player sees what was repaired, and the original is kept for download. Imports still show a preview, which lists any repairs.
- [x] **Rolling snapshots.** Three earlier copies are kept, at least 10 minutes apart. Settings lists them and can restore one through the usual preview-and-undo flow.
- [x] **Last-backup reminder.** Settings shows when the last backup was downloaded. One gentle nudge per session appears after 7 days, once the patch has earned £1,000.
- [x] Browser polyfills (`Object.hasOwn`, `replaceChildren`) move into the game, so the HTML file works on older iPhones.
- [x] Saves with a newer schema (10 and up) are refused with an explanation and never overwritten.
- [ ] Android Auto Backup is evaluated (needs the rebuilt Android project, Phase 7).
- [ ] A copy-and-paste transfer code for moving saves without files.

**Done when:** a save with a corrupted section loads with only that section reset, which a test proves. A snapshot restore works in the browser, which the smoke test proves. Older saves still load.

### Phase 2: 3.1 "Night Market", demand and balance

The measured problem: income is capped by demand, production is wasted, and the whole game lasts 5–6 hours.

1. **Lock in a baseline.** CI fails if the planner player's `everythingBought` time or £/min drifts more than 15% from `test/fixtures/sim-baseline.json` without the file being updated.
2. **Point new players at the shop.** Once £600 is in reach, the next-goal line says "Open Skyla's shop".
3. **A second till** as a shop upgrade, so the capacity upgrades help. Measure the income each upgrade adds per pound spent.
4. **Barn capacity.** Stock above the cap goes to a useful outlet instead of piling up.
5. **Rebuild the preserving bench** (lost in 2.11): orange chutney, then premium recipes, with timed batches, held ingredients and jar demand indoors.
6. **Visitor groups and arrival-rate levels** for the stall (lost in 2.14), tuned against the new demand.
7. **Tending gives quality**, which the helper can't. A tended plot earns a quality star worth +20%, so tapping has its own value.
8. **Rescale costs** so a full playthrough lands in the targets below.

**Done when:** every upgrade shows a measurable effect in the simulator, unsold stock stays bounded, and the pacing targets are met within 15%.

| Milestone | Target active play |
| --- | --- |
| First sale | under 2 min |
| Shop opens | 15–25 min |
| Helping hands | 20–30 min |
| £10k earned | about 2 h |
| Every farm and shop upgrade | 8–10 h |

### Phase 3: 3.2 "Signposts", goals and onboarding

- **A goal ladder.** About 25 titled levels replace the 4 that end at £1,000. They span farm, shop, house, wardrobe and favours, and each comes with a small reward or line of banter.
- **"Next three goals"**, a rolling panel on the patch.
- **Upgrade paths**, rebuilt from the lost 2.13: five branches with prerequisites and the next reachable goal.
- **The Journal becomes a completion tracker**, with a percentage per collection.
- **Friendly hints** from stats the game already counts: visitors who left over budget or because stock ran out.
- **First-two-minutes check.** A new player plants, harvests and sells without opening Help, and the smoke test checks it.

### Phase 4: 3.3 "Market Choices", real decisions

- **A pricing dial per variety**, ±30% in 5% steps. Each customer profile has a tolerance.
- **Reputation**, shown as lantern glow, from 30 to 100. It rises with fair prices, full displays and served regulars, raises arrivals by up to 1.4×, and never falls below 30.
- **Crop traits.** Moonlight sells better on moon nights, Witchfire buyers tip, and Starlight has a chance of a double yield.
- **New varieties.** Jack-be-little, ghost pumpkin and giant pumpkin, a trophy only.
- **A featured window slot** and bundles such as "a pair for the porch".
- **Banter seeds become features:** naming one pumpkin a night (Kevin), a loyalty card and the fairy-light path.
- **Done when:** three different strategies reach the milestones within 25% of each other.

### Phase 5: 4.0 "Neighbours", people and home

- **Regulars.** Pip, Mabel, Count Bram, Bones and Patch each get five friendship levels, a favourite variety and a four-chapter story with requests and keepsakes.
- **Banter** grows from 15 to about 80 lines, keyed to events. Skyla gets new behaviours.
- **Haunting tiers.** The haunting score becomes atmosphere tiers with small, capped bonuses that unlock story chapters.
- **Costume sets.** Matching costume collections give a duo bonus.
- **Lost home features rebuilt:** item resizing from 2.16, then shop looks and fixtures from 2.12.
- **Art proof** (roadmap B0/B5). One room with a layered outfit and a seated pose, before any large catalogue.

### Phase 6: 4.1 "Seasons", reasons to return

- **Welcome back.** After at least 10 minutes away, a capped receipt covers up to 4 hours at about 40% of current income. It is worked out once on load, not by running the clock.
- **"Tonight at the patch":** three small goals a night. Missing them costs nothing.
- **Market Night:** a weekly request from a regular.
- **Seasonal events:** Bonfire Night, midwinter and spring reskins, all optional.
- **New Season:** an opt-in reset at about £50k earned. The house, wardrobe, journal and friendships stay, and the player earns Moon Seeds for permanent perks.

### Phase 7: 4.2 "Polish", feel, reach and code health

- **Feel:** squash and stretch, coin arcs, varied sale chimes, three music tracks with crossfades, ambience, and separate volume controls.
- **Accessibility:** text size, high contrast, plot states shown by shape as well as colour, and an in-game reduce-motion toggle.
- **Size:** re-encode the large WebP files, embed Fraunces or choose the serif deliberately, and keep the first screen under 3 MB in the Android build.
- **Code health:** split `app/game.js` into loop, renderer and HUD; consolidate the CSS against screenshots; rename the leftover `level2`-style names.
- **Android:** rebuild the Android Studio project from [ANDROID.md](ANDROID.md), add Auto Backup rules and a release signing workflow.

## Decisions still needed

| Decision | Blocks | Default if unanswered |
| --- | --- | --- |
| Can the 2.16 build or source be found? | Phases 2–5 re-implement lost work | Rebuild as planned |
| Who is the audience: the two of you, or public? | Licensing checks for the music and fonts | Treat it as private |
| Is a New Season reset wanted at all? | Phase 6 | Build it as opt-in only |
| Are events tied to the device date acceptable? | Phase 6 | Yes, and always optional |
| Is the Android signing key available? | Updating installed APKs | Ship the HTML file only |
