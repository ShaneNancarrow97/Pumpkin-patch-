# Balanced farm and village progression

Follow-up to `9e012ad` on `contractor/mothlight-full-expansion`. This closes the ability to grind millions before a village checkpoint and then unlock several later ranks using the same takings. Claude's working checkout and lead branch are untouched.

## Player behaviour

All sales still pay their full coins. Lifetime takings, separate tips, business ledgers, stock, prices and existing upgrades retain their meaning. Village and home requirements still apply.

From the village progression stretch, level progress can bank the next rank plus **25% of the interval to the rank after it**. After promotion, at least the other 75% must come from new trade. For example, a level5 farm can bank £15,375 of level progress: level6's £12,500 threshold plus £2,875 towards level7's £24,000 threshold. Even £10 million of trading cannot bank level7. The £10 million remains money for the farm.

Early levels1–5 retain their existing earnings/house/invitation flow. They share the first cap at level6 rather than introducing caps during the tutorial. Level20 has no nonexistent level21 head start. Bonus gifts and duplicate-gift compensation remain excluded from progress.

The existing level checklist calls the counter **Level progress** and explains the head start. At a blocked full bank it says **Progress bank full**. It stays in the existing scrollable checklist; there is no new HUD, modal or action to claim progress. The all-levels list uses the same terminology.

## Dependency matrix

| Change | Also check | Contract |
| --- | --- | --- |
| `rules/levels.js`: `progressBalance` | `patchLevel`, all tier unlock quotes, home/village gates | Read-only; cap derives from the highest **claimed** rank, never from a speculative future rank. |
| `awardLevels` | model update, reward/duplicate coins, gift receipts | Settle credit and observe **all** trade before awarding. Overflow must never become new trade after a cap increase. |
| `levelEarnings` | quests, tips, trade statistics, existing economy simulation | Remains lifetime takings minus bonus coins. Do not replace it with capped credit. |
| Save version20 | `restoreProgression`, kept files, pace1/2 migration | Keep wallet, lifetime earnings and already awarded ranks. Seed old saves once; preserve old pace floors. |
| Credit restore | saving immediately after a sale, missing/malformed fields, pause | Normalise pending trade once without granting rewards or paying money. Repeated load cannot recredit overflow. |
| UI labels | requirement presenter, collection sheet, phone/Fold landscape, controller focus | Keep the real trading threshold, separate it from lifetime earnings, retain touch targets and existing controls. |
| QA fixtures | cooking, hayride, visitor events, old high-income staging | Declare already-earned ranks explicitly. A cash total alone no longer means an earned late-game rank. |

## Save schema and migration

`STATE_VERSION` is **20**. `progression.levelCredit` is the settled cumulative progress value; `progression.observedTrade` is the last lifetime non-bonus takings already accounted for. Additional trade is credited up to the current bank limit. Observing the entire trade total, including overflow, is essential: merely clamping a display would leave the exploit intact.

Version19 and earlier saves initialise credit from existing non-bonus takings within the cap for their honoured rank, and initialise observed trade to that full takings total. All valid claimed ranks, pending rewards, old pace floors, coins and lifetime earnings remain. Missing/invalid credit fields in newer saves are repaired within real takings and the bank limit. The new `test/fixtures/save-file-v1-state20.json` is additive; no old fixture is rewritten.

This is pacing, not protection against editing a save file or developer console. Campaign duration still depends on farm investment and player decisions; the checks establish that previously banked trade cannot clear future ranks, not a fixed number of hours per rank.

## Verification and delivery

`test/level-progress-balance.test.mjs` exercises long blocked grinds, each later rank's fresh-trade requirement, large single sales, quest-before-tick ordering, save-between-sale-and-update, version19 migration, reward exclusions, pause and malformed credit. Existing boundary, old-pace and once-only gift checks remain. Two presenter tests cover the full-bank explanation and the final level.

The final full test receipt, exact-build browser checks/screenshots and download hashes are under `verification/balanced-progression*`. `tools/balanced-progression-qa.mjs <html> <output-folder>` reproduces the focused browser check against actual shipped rules, with normal software rendering at desktop, phone, landscape and unfolded Fold viewport sizes. The standard compatibility smoke uses unchanged HTML bytes over loopback because managed Chromium blocks local file URLs. No physical-device performance, Bluetooth or native APK validation is claimed for this follow-up.

Final results: **1,197 tests pass**, **54 standard browser smoke checks pass**, and **15 focused exact-build browser checks pass** with no page errors. Both retained screenshots were visually reviewed. ZIP CRC passes and its `index.html` has the same SHA-256 as the checked standalone HTML.

Download names on `contractor/mothlight-full-expansion-html`: `Pumpkin-Patch-Balanced-Progression.html` and `.zip`. HTML SHA-256: `7b30a357bba2a262000a71c1424d829ae90bd3b518bfab43d65123d33503542c`. The ZIP/build receipt records its own hash and byte counts. Earlier APK deliveries retain their earlier HTML; this follow-up does not claim a rebuilt APK.
