# Checked Mothlight delivery

Game code commit: `367b037c1293c39342f81c56d13051ed6f7b5d88`. Base: `8048fd32e5dbdf33b81d38c78c07b05ecef5be7f`. Branch: `contractor/mothlight-full-expansion`. The source handover is split by complete review part in README.md; keep the dependency matrix while resolving concurrent changes.

## Game files

| File | Bytes | SHA256 |
| --- | ---: | --- |
| Pumpkin-Patch-Mothlight-Expansion.html | 60,328,415 | `ab6ac3af9f1a2024693952d6fd987a7ad2473fad622785473022271f1c7ad1a6` |
| Pumpkin-Patch-Mothlight-Expansion.zip | 43,350,433 | `86832680c65dfcba0f531f96d629e02983ee79e493b23beb73bd0487d55a72a9` |

The ZIP has index.html and READ-ME.txt. CRC passes and its HTML is byte-identical to the standalone file. Everything needed for play is embedded. Export your existing save through Settings before changing origins, then import it in the new file/app. Migration is additive to save19; claimed levels remain honoured.

The HTML, ZIP and Claude kit were published at artifact commit `17b8b245bf4fed5bd953ff8b9bc6c34689d94e0b`. Anonymous public downloads were streamed in full and matched each byte count and SHA256; [public receipt](verification/game-public-downloads.json). Downloads are on the separate `contractor/mothlight-full-expansion-html` branch, preserving all older release filenames. Android is built last, after game-file publication, and has its own addendum.

## Completed verification

- **1,183 actual named Node tests pass** in a clean replay checkout, with no failures. Complete output: [clean-replay-tests.txt](verification/clean-replay-tests.txt).
- The game patch applies cleanly from the exact base. Source and replay trees both equal `1fbffa4fbee46a87115abeea503c308ecbf7201c`; the replayed build produces the identical standalone HTML. [Replay receipt](verification/clean-code-replay.json).
- **103 integration checks pass** on the exact canonical HTML, including actual controller walking, nearby clues, all four puzzle widgets, timed mining and cooldowns, cave6/9/15 gates and nested returns, Granny’s level8 cottage, save19 reload, real home/garden rewards, cooking and the exact festival delivery. [Authoritative QA summary](verification/final-acceptance/FINAL-QA.json).
- **4 additional actual nearby TV/dialogue checks pass** with Corvus and Natalie, including visible dialogue choices and PlayStation legends. [Normal TV view](verification/final-acceptance/tv-dialogue/21-tv-corvus-dialogue-controller.png).
- **54 standard desktop/phone compatibility smoke checks pass** using unchanged smoke.mjs and SHA-validated captured bytes. This profile holds renderer/composer draws for logic; normal visual proof is separate. Managed Chrome blocked direct file:// navigation, so the passed run uses loopback and retains the blocked-file receipt. [Smoke output](verification/final-acceptance/standard-smoke-logic.txt).
- **21 fresh normal-render screenshots** retain original glow/shadows and real RAF ticks. No screenshots were reused from earlier candidates. The full integration reports zero page/shader/runner errors and zero external asset requests. [Cave](verification/final-acceptance/03-fold-shallow-cave.png), [Granny’s cottage](verification/final-acceptance/08-fold-granny-cottage.png), [Workings](verification/final-acceptance/10-fold-cave-workings.png), [Lantern Night](verification/final-acceptance/16-fold-lantern-night.png).
- Voice audit retains all164 recordings unchanged and exactly declares396 pending requests; no recording service was called. Art and voice part receipts are retained separately.

The fixtures explicitly declare prepared levels and legacy/branch prerequisites. The runner physically earns the new Copse chapters and performs guarded world/UI transactions; it does not claim an uninterrupted level1–20 campaign or campaign-duration measurement. Software Chromium timings are slow and are not physical-device FPS evidence. Viewport/mocked-pad tests do not certify actual Fold7, TV, Bluetooth or Android performance.

Final corrections include readable cave lighting, collision-safe camera framing, unobstructed cave entry arches, actual four-seal aggregation, a stock-consuming festival delivery and accurate completed-quest/reward presentation. Earlier failed visual/fixture diagnostics remain preserved locally outside the shipping patch; the linked final evidence is authoritative.

## Verified public downloads

- [HTML](https://raw.githubusercontent.com/ShaneNancarrow97/Pumpkin-patch-/17b8b245bf4fed5bd953ff8b9bc6c34689d94e0b/Pumpkin-Patch-Mothlight-Expansion.html)
- [Game ZIP](https://raw.githubusercontent.com/ShaneNancarrow97/Pumpkin-patch-/17b8b245bf4fed5bd953ff8b9bc6c34689d94e0b/Pumpkin-Patch-Mothlight-Expansion.zip)
- [Claude kit](https://raw.githubusercontent.com/ShaneNancarrow97/Pumpkin-patch-/17b8b245bf4fed5bd953ff8b9bc6c34689d94e0b/Pumpkin-Patch-Mothlight-Expansion-Claude-Patch.zip)

The complete two-patch kit targets source `5852e0bc1aa10a8a9fb2134693b7bc9c88db6cd7`; its replay commit `07050d8b6ddfab21d24244fa7f19dbb1358eeb0a` matches source tree `16fabd44225d8da11ce983f673569e7c1adefaea`, and rebuilds the identical HTML. The later publication/native receipt commits contain delivery information and the optional Android version update; they do not change game behavior.
