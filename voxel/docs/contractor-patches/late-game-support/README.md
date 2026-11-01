# Late-game contractor support pack

Three finished voxel display props, six painted menu icons, a reproducible
attraction-capacity audit and three proposed Festival Nights for Claude to review.
Everything is confined to this folder. **Nothing is installed in the live game.**

Open `Pumpkin-Patch-Late-Game-Workshop.html` from the delivery ZIP to inspect the
models in 360°, read the evening briefs and compare the actual audit results.
It is an offline review workshop, **not a new playable-game release**. It never
reads or writes a player save. The previous playable HTML remains unchanged.

Start with [Claude's handover](docs/HANDOVER.md). For focused review:

| Part | Read | Status |
| --- | --- | --- |
| Voxel rewards | [Model API and dimensions](models/README.md) | Built and animated; not catalogue entries or granted rewards |
| Menu artwork | [Atlas manifest](art/manifest.json), [visual contact sheet](art/review.jpg) | Six transparent icons; not added to live menus |
| Attraction mechanics | [Findings and limits](findings/AUDIT.md) | Actual imported rules, controlled prepared fixtures |
| Festival evenings | [Content brief](docs/FESTIVAL-CONTENT.md), [proposal JSON](data/festival-themes.json) | Design content only; targets need whole-game tuning |
| Verification | [Recorded scope and results](verification/README.md) | Native checks, browser evidence and isolated patch checks |

## Rebuild and check

Use the existing repository layout and locked `voxel` dependencies. From the
repository root, after `npm ci --prefix voxel` if dependencies are missing:

```sh
node --test voxel/docs/contractor-patches/late-game-support/test/*.test.mjs
node voxel/docs/contractor-patches/late-game-support/tools/build-preview.mjs --out /tmp/Pumpkin-Patch-Late-Game-Workshop.html
node voxel/docs/contractor-patches/late-game-support/tools/qa-preview.mjs /tmp/Pumpkin-Patch-Late-Game-Workshop.html /tmp/late-game-preview-checks
```

The preview build refuses a stale rule snapshot. After changing relevant game
rules or the auditor, regenerate both reports using the commands in
[AUDIT.md](findings/AUDIT.md), inspect the new findings, then rebuild. Rebuilding
does not rebalance the game or validate proposed event difficulty.

The browser check requires Chromium (`CHROMIUM_PATH` can override
`/usr/bin/chromium`) and the existing Playwright dependency. It uses only the
offline HTML over a temporary localhost server, with external requests blocked.

## Independent pickup

Source branch: `contractor/late-game-support-pack`.

Use the folder-only patch in `Pumpkin-Patch-Late-Game-Claude-Kit.zip`, or copy this
folder into Claude's current checkout. Do not merge the branch's earlier sprite
history simply to obtain these assets. The patch has no changes to game source,
dependency manifests, global handovers, economy, saves, controls or sprites.

The kit records exact tested bases and hashes. Changes to the lead's relevant
rules may require regenerating the audit; that is an intentional freshness
check, not a reason to overwrite the lead's work.
