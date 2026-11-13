# A shorter automatic tea break

Follow-up to `c5a65f6` on the isolated `contractor/mothlight-full-expansion` branch. The old ten-minute inactivity counter is replaced by a **3½-minute** automatic pause. A small purple/amber notice counts down **0:30 to0:01**, beginning after three minutes without input. Touch, mouse, wheel, keyboard and an active controller reset the deadline. Continuing to hold a touch control, key or either stick counts as activity.

At210 seconds the existing `state.paused` flag freezes normal farm and village simulation. The notice becomes a compact **Tea break / Resume game** card; a tap, key or controller input resumes. Ordinary input never clears a manually selected tea break. If the automatic break stopped an active maze or tractor POV, it also pauses that independent ride/audio and resumes only that same ride on return. A POV already paused by the player remains paused.

## Dependency matrix

| Change | Also check | Contract |
| --- | --- | --- |
| `src/idle-break.js` | boundary tests, manual pause, old frame pacer | Use monotonic real elapsed time, not farm time or the frame-clamped delta. Warn at180s; pause at210s once. |
| `ui/idle-break.js` | touch sticks, keys, standard PS5 mapping, blur/visibility | Held inputs remain active. Clear lost holds on blur/hidden pages. Ignore stick drift and nonstandard trigger axes. |
| `main.js` tick | village-away earnings, paused model, save, owner actions | Check the deadline before the next model update. This UI never changes money, quests or progression. |
| POV pause callbacks | maze and hayride status, sound, manual pause | Remember only the ride this automatic break stopped; preserve manual pauses and changed scenes. |
| `index.html`, `ui/idle-break.css`, `build.mjs` | safe areas, landscape, TV zoom, screen readers | Include the stylesheet offline. One temporary notice,44px Resume target, phase announcements rather than30 repeated spoken countdowns. |

The clock and input ownership are transient. Save version remains20, the existing pause field keeps its meaning, and old save fixtures are untouched. As before, a saved paused farm reloads paused and can be resumed from Settings. A newly opened build starts a fresh inactivity deadline. No setting, dependency, remote asset or extra economy system is added.

## Verification

`test/idle-break.test.mjs` covers exact timing, long frame gaps, activity resets, manual ownership, radial stick activity, held/released/cancelled controls, hidden/blurred pages, announcements and teardown. `tools/idle-pause-qa.mjs <html> <output-folder>` checks the real shipped game using an injected monotonic clock, including frozen income, touch/keyboard/controller resume, village and both POVs. The clock injection advances inactivity only; it is explicitly not a3½-minute real-time hardware test.

Final full-suite, exact-build browser and compatibility-smoke receipts and screenshots are stored under `verification/idle-pause*`. Viewport checks include phone, landscape, unfolded Fold and TV; physical Bluetooth/controller/mobile performance is not inferred from them. Latest download names are `Pumpkin-Patch-Idle-Pause.html` and `.zip` on `contractor/mothlight-full-expansion-html`. Earlier APKs remain their original releases.

Final checked build: **1,210 tests pass**, **54 standard browser checks pass**, **28 combined feature checks pass**, and **four focused Rowan interior checks pass**. Normal screenshots were visually reviewed. HTML SHA-256: `7d98627500fd97fab432ecc5dffed906339a043fffed6c17983a1002708c7114`; ZIP CRC and embedded HTML identity pass.
