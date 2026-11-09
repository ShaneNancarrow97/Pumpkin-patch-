# Checked game delivery

Source: `contractor/village-menu-refinement`, based on `50afb77c5596189c57c48c7c8a4c379e9baa4b97`. Functional changes end at `b1ac09c`; the final contrast/verification commit and separate native addendum follow. Claude's lead checkout and save format18 remain untouched.

| File | Download |
| --- | --- |
| Full offline game | [HTML](https://raw.githubusercontent.com/ShaneNancarrow97/Pumpkin-patch-/contractor/village-menu-refinement-html/Pumpkin-Patch-Village-Menu-Refinement.html) |
| Extract and play | [ZIP](https://raw.githubusercontent.com/ShaneNancarrow97/Pumpkin-patch-/contractor/village-menu-refinement-html/Pumpkin-Patch-Village-Menu-Refinement.zip) |
| Ordered game patches and evidence | [Claude kit](https://raw.githubusercontent.com/ShaneNancarrow97/Pumpkin-patch-/contractor/village-menu-refinement-html/Pumpkin-Patch-Village-Menu-Refinement-Claude-Patch.zip) |

HTML: **58,603,705 bytes**, SHA-256 `38895eb42cc1e45a9dd9193a7fa42d58d987f264e4a3b6685b004f9eefbc2dcf`.

Game ZIP: **42,303,996 bytes**, SHA-256 `d4ea2dd42a0675d99e07b11dce06d4ce1a0367007901190602bd9519bb48b7e1`. Its `index.html` is exactly the HTML above.

The final source passes **995/995 Node tests**, with no failures or skipped tests. The preceding exact `cf0e1290` candidate passed **105/105 integrated village/controller/level checks** and **54/54 standard desktop/phone smoke checks**. Screenshot review then identified initial carousel scrolling clipping the requirements heading. The functional delta fixes that and adds the user-requested clearer village PS5 legend, passing 35/35 focused browser checks; its report and photographs are under [final-a77a5d1e](verification/final-a77a5d1e). The shipped HTML then improves only the ready Cross symbol’s contrast against amber, with its exact-hash final photographs and checks under [final-38895eb4](verification/final-38895eb4). Earlier evidence is retained under its real hash, not relabelled as final.

The clean contractor replay rebuilds identical final HTML. `PATCHKIT.json` in the kit records the base, ordered binary patches, exact source tree and replay result. Apply the game patches together from that base, or inspect the contractor branch in an isolated worktree. Review conflicts with Claude's newer work deliberately, especially shared `main.js`, `build.mjs`, village controls and cooking layout consumers.

Test fixtures declare the synthetic save, mocked native Gamepad input and any held renderer draws. Normal screenshots use the real renderer. Phone390×844, landscape844×390, Fold864×756 and TV1920×1080 layouts are covered. Zero page/shader errors and external asset requests were observed in the integrated browser checks. This is not a physical-device/Bluetooth or frame-rate certification. File navigation blocked by Chromium policy was retried over loopback with unchanged captured HTML; that failed environment attempt is retained in the smoke evidence.

The final immutable public links and full-download hash receipts are appended after publication. HTML/ZIP/game-kit publication precedes Android packaging. The Android addendum retains its separate patch and verification scope.
