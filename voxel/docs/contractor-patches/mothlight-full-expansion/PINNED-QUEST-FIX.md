# Completed chapter pinned to the village HUD

The reported screenshot shows **The Ink Beneath the Roots ·3/3 ·Complete** occupying the expanded tracker in Rowan's workshop. The old presentation deliberately retained completed expansion chapters. The follow-up changes this behaviour: completion clears that chapter's pin and route, collapses its details, and uses the existing six-second completion receipt. Completed chapters and their rewards remain in the journal archive.

Both tracking stores matter: `village.expansion.tracked` in the save and `prefs.villageTrackedQuest` in local UI preferences. The rule clears only the chapter being completed, rejects re-pinning completed chapters, and sanitises old completed pins on load. The runtime repairs stale UI preferences on village entry and on a real completion event. Its read-only tracker lookup also excludes completed chapters. Another active story the player followed remains valid.

Quest waypoints now carry their chapter ID so completion removes the matching stale route without clearing an unrelated resource/guest destination. When no active quest remains, the HUD hides and D-pad Up cannot expand an empty tracker. Available but unstarted stories can still be found in Quests and at their neighbours. Opening an old save does not replay a completion reward or celebration.

| Dependency | Invariant |
| --- | --- |
| Chapter settlement / saved tracking | Clear only the completed ID; retain chapter flags, receipts and rewards. |
| Save restore / UI preferences | Repair both stores; a stale preference cannot override a valid saved active story. |
| Tracker / journal / D-pad | Completed chapters live in the archive; active tracker and controller toggle share visibility. |
| Wayfinding | A chapter route clears on completion; unrelated destinations stay intact. |
| Completion notice | Presentation never pays or re-awards anything; keep the existing bounded six-second receipt. |

Save version remains20 and no fields are added. Regression coverage includes live completion, stale save and preference repair, route/detail cleanup, hidden empty HUD, preventing re-pinning, preserving a different selection and unchanged reward receipts. The exact-build browser receipt and Rowan workshop screenshot are in `verification/idle-pause/`, shared with the [inactivity update](IDLE-PAUSE.md). Both ship in `Pumpkin-Patch-Idle-Pause.html` and `.zip` on the contractor download branch.

Final checked build: **1,210 tests pass**, **54 standard browser checks pass**, **28 combined feature checks pass**, and **four focused Rowan interior checks pass**. Normal screenshots were visually reviewed. HTML SHA-256: `7d98627500fd97fab432ecc5dffed906339a043fffed6c17983a1002708c7114`; ZIP CRC and embedded HTML identity pass.
