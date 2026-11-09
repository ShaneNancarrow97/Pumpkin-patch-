# Checked game delivery

Source: `contractor/village-menu-refinement`, based on `50afb77c5596189c57c48c7c8a4c379e9baa4b97`. Functional UI changes end at `b1ac09c`; contrast verification and the five-song catalogue addition (`8f4bb51`) follow, with a separate native addendum. Claude's lead checkout and save format18 remain untouched.

| File | Download |
| --- | --- |
| Full offline game | [HTML](https://raw.githubusercontent.com/ShaneNancarrow97/Pumpkin-patch-/contractor/village-menu-refinement-html/Pumpkin-Patch-Village-Menu-Refinement.html) |
| Extract and play | [ZIP](https://raw.githubusercontent.com/ShaneNancarrow97/Pumpkin-patch-/contractor/village-menu-refinement-html/Pumpkin-Patch-Village-Menu-Refinement.zip) |
| Ordered game patches and evidence | [Claude kit](https://raw.githubusercontent.com/ShaneNancarrow97/Pumpkin-patch-/contractor/village-menu-refinement-html/Pumpkin-Patch-Village-Menu-Refinement-Claude-Patch.zip) |

HTML: **58,911,354 bytes**, SHA-256 `e5858bc666dbf4f8160e5d964249044eddfe2e70dc7bc1d0cc9bbfd175c7c4e0`.

Game ZIP: **42,376,785 bytes**, SHA-256 `96c91840b91e66c562cac78c5fed7098b5b97cd0d511cf18584cf525232b8f21`. Its `index.html` is exactly the HTML above.

The UI source passes **995/995 Node tests**, with no failures or skipped tests. The subsequent catalogue-only addition passes all **6 focused MIDI/audio tests** and the **31/31 source catalogue audit**. The preceding exact `cf0e1290` candidate passed **105/105 integrated village/controller/level checks** and **54/54 standard desktop/phone smoke checks**. Screenshot review then identified initial carousel scrolling clipping the requirements heading. The functional delta fixes that and adds the user-requested clearer village PS5 legend, passing 35/35 focused browser checks; its report and photographs are under [final-a77a5d1e](verification/final-a77a5d1e). The UI-only `38895eb4` candidate then improves the ready Cross symbol’s contrast against amber: its nine palette/geometry checks and six steady-Fold checks pass, with 6.89:1 minimum measured contrast. Its normal-render TV controller photograph is the approved user image; the Fold software-font paint limitation is documented. See [final-38895eb4](verification/final-38895eb4). The shipped HTML adds only the five supplied MIDI entries after that UI build; all 14 of its own catalogue/audio browser checks pass, with no page errors or external requests, in [music-final-e5858bc6](verification/music-final-e5858bc6). Earlier evidence is retained under its real hash, not relabelled as final.

The clean contractor replay rebuilds identical final HTML. `PATCHKIT.json` in the kit records the base, ordered binary patches, exact source tree and replay result. Apply the game patches together from that base, or inspect the contractor branch in an isolated worktree. Review conflicts with Claude's newer work deliberately, especially shared `main.js`, `build.mjs`, village controls and cooking layout consumers.

Test fixtures declare the synthetic save, mocked native Gamepad input and any held renderer draws. Normal screenshots use the real renderer. Phone390×844, landscape844×390, Fold864×756 and TV1920×1080 layouts are covered. Zero page/shader errors and external asset requests were observed in the integrated browser checks. This is not a physical-device/Bluetooth or frame-rate certification. File navigation blocked by Chromium policy was retried over loopback with unchanged captured HTML; that failed environment attempt is retained in the smoke evidence.

The final immutable public links and full-download hash receipts are appended after publication. HTML/ZIP/game-kit publication precedes Android packaging. The Android addendum retains its separate patch and verification scope.
