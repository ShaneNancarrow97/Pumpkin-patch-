# Claude contractor handover — boost and personal farm skills

The farm has a paced work loop: Plant does one plot per press, manual picking uses the selected owner's trained capacity, and Shane/Natalie are separate one-off helping-hand hires with their own speed and basket upgrades. Boost now has paid power/cooling tiers and a small saved overheat dial in its existing button.

Source branch: **`contractor/boost-helping-hands`**.

Lead base: **`f2f96f8351dea4cf6072862b1e3e0b14d6a318dc`**.

Implementation commit: **`2b50fa37a58b8c87132b290fc2bfc0af79f852c6`**.

## Take this part

Fetch the source branch, inspect the implementation commit, then cherry-pick that commit onto a clean lead integration worktree. Preserve any unpublished Claude changes; resolve the small adapter overlaps deliberately. This branch is directly based on the recorded lead head, not on the separate concept-art or Mothlight UI branches.

```sh
git fetch origin contractor/boost-helping-hands
git show --stat 2b50fa37a58b8c87132b290fc2bfc0af79f852c6
git cherry-pick 2b50fa37a58b8c87132b290fc2bfc0af79f852c6
```

Alternatively, copy this folder and review `changes.patch`, then run `git apply --check` before applying it. The patch contains only the implementation commit's runtime, build and test changes; it does not contain this handover recursively. It has been checked against a detached clean worktree at the recorded base. Use the later handover commit too if you want the repository documentation, screenshots and QA runner.

## Complete behaviour

- **Plant 1:** one open empty bed per mouse/touch press or P. Plot taps still plant their selected bed.
- **Pick:** one/two/three distinct ripe plots according to the selected character's basket tier. H uses the same capacity. Control-mode extra picks stay within 3.2 units of the reached crop and the character. Yield per plot remains separate.
- **Boost:** all entry points share heat. Base use adds 10%, cooling removes 8% per active second, 100% locks the action until 35%. Three power tiers and three cooling tiers remain bounded. Rejected inputs have no effects. Pause freezes heat and saves retain it.
- **Helping hands:** hire Shane and Natalie once for £250 each. Three planting-speed and three watering-speed tiers per owner, plus two basket tiers. The menu shows exact next values, prices and level gates.
- **Real work:** each helper reserves an actual crop and completes one turn at a time. Changed crops invalidate partial work. Picking batches protect the other helper's reservation. Helpers rest in control mode, keep the eight-second ripe grace and never build a player harvest streak.
- **Saves:** version 15; old shared Helping hands purchase grants both owners without another charge. New one-owner saves stay one-owner saves. Water cooldowns and ripe timestamps survive loads. Partial helper actions restart safely.
- **Interface:** Patch / Helping hands / Boost are inline Farm sections. Existing sprites/icons, purple surfaces, amber hold-to-buy prices and pad menu navigation are reused. The dial adds no new floating panel.

Read [DESIGN.md](DESIGN.md) for precise costs/effects and [DEPENDENCIES.md](DEPENDENCIES.md) for affected systems and integration risks. The levels list includes the new gates; existing thresholds, old claims, attractions and visitor wallets remain intact.

## Files and boundaries

New pure modules: `rules/farm-work.js`, `rules/farm-buttons.js`. New UI: `ui/farm-work-ui.js`, `ui/farm-work.css` (loaded last in `build.mjs`). Small adapters are in `model.js`, `rules/farm.js`, `hands-on.js`, `life-actions.js`, `life-activity.js`, `main.js`, `scene.js`, the farm/collection sheets and the helper memory.

No character art, voxel building, music or ride code changed. Helper visuals still follow completion events through the existing owner sprites; they are not a new path-authoritative animation system. `scene.sendTo(plot, owner)` routes a named owner, bounds its queue and leaves ingredient-delivery reception alone.

Compatibility `buyUpgrade(s,"auto")` remains for earlier tools: it is the old £500 bundle and grants both. New UI only offers individual hires. `upgrades.auto` remains the legacy/achievement flag; **`farmWork.helpers` is authoritative for which owner is hired**. Never infer a second hire from that flag when structured new data exists.

The global `update` now rejects non-finite/non-positive frame intervals. No offline progress or wall-clock cooling was added.

## Build and verify

```sh
cd voxel
npm ci
npm test
node build.mjs --out /tmp/Pumpkin-Patch-Boost-and-Helping-Hands.html
node tools/qa-farm-work.mjs /tmp/Pumpkin-Patch-Boost-and-Helping-Hands.html
```

`CHROMIUM_PATH` is used by the standard smoke. The focused QA runner uses the installed `/usr/bin/chromium` and HTTP to load the real offline HTML. `FARM_QA_FOCUSED_ONLY=1` skips its preliminary full smoke when only the new feature checks are needed. Browser software WebGL is much slower than device gameplay.

See [VERIFICATION.md](VERIFICATION.md) for the actual run scope and [build-receipt.json](build-receipt.json) for exact HTML/ZIP hashes. The playable file is built from the implementation commit. Extract its ZIP and open the HTML in Safari or Chrome; the existing fullscreen control remains available for Fold use.
