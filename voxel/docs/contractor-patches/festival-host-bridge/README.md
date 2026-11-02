# Festival Host Bridge · Mothlight ledger

The latest visual pass opens the optional Festival desk as a witchy seasonal
ledger: warm parchment pages, a mulberry cover, a shaded book gutter, original
moth and pressed-botanical marginalia, and small handwritten flourishes.

**This folder remains a private real-rule lab.** For the current full-game UI
work, use [`contractor/mothlight-game-ui`](https://github.com/ShaneNancarrow97/Pumpkin-patch-/tree/contractor/mothlight-game-ui).
The Festival lab does not boot the game, read a player save, install live hooks,
register physical rewards or change the original save schema.

Real food, cocoa, garden and paid hayride rules feed confirmed facts through the
existing durable bridge. Quotes, committed spending and delivered goal progress
remain separate. Replaying a fact cannot debit another guest or consume stock.
Completed evenings retain their earned summary; a repeat uses fresh actual goals.

## Review and pickup

Start with [Claude handover](docs/HANDOVER.md) and the current
[visual review](docs/VISUAL-REVIEW.md), then [API](docs/API.md),
[integration seams](docs/INTEGRATION-NOTES.md) and [dependencies](docs/DEPENDENCIES.md).
The [change assessment](docs/CHANGE-IMPACT.md) distinguishes this lab's checks from
future live integration requirements.

Source branch: `contractor/festival-host-bridge`.
Mothlight UI source: `7f8b15f` (with the current documentation/evidence follow-up).
Previous lab refinement: `b71a3f75a45926ec6c0a89a808a24fb496b2a17e`.
Reviewed live producer contracts: `f2f96f8351dea4cf6072862b1e3e0b14d6a318dc`.
Prerequisites: the isolated `festival-session` and `late-game-support` folders.

The previously published `contractor/festival-host-download` kits describe older
lab revisions. Their HTML hashes and patch/rebuild proofs do not describe this
Mothlight source iteration. Rebuild this lab from the source branch; preserve
Claude's unpublished work and review any newer producer/save contracts before
installing live hooks. This documentation pass publishes no new artifact kit.

## Build and verify

From the repository root, with the existing voxel dependencies installed:

```sh
node voxel/docs/contractor-patches/festival-host-bridge/tools/build-preview.mjs --out /tmp/Pumpkin-Patch-Receipt-Lab.html
node voxel/docs/contractor-patches/festival-host-bridge/tools/run-native.mjs --include-prerequisites --out /tmp/festival-native.json
node voxel/docs/contractor-patches/festival-host-bridge/tools/qa-preview.mjs /tmp/Pumpkin-Patch-Receipt-Lab.html /tmp/festival-browser
```

The desktop desk reads as an open two-page book; phones receive one continuous
page flow. Moths, pressed stems and margin notes never catch pointer input.
Functional actions, prices, stock and goal progress retain DM Sans/Fraunces.
Caveat is embedded with its SIL Open Font License 1.1 and is used for nonessential
handwritten flourishes, flavour text and keepsake lettering.

The exact offline lab is **1,544,786 bytes**, below its **2 MiB** browser-checked
budget. Fonts and the three reviewed service atlases are embedded. Exact food
art follows the quoted recipe; category/fallback art is illustrative, never proof
of order contents, payment or ownership. Reduced-motion mode removes one-shots
and the faint running-service light.

Verification: **163 native cases across 22 files**, including the two prerequisite
packs; **145 browser assertions** against the exact HTML. Phone, unfolded and
landscape layouts, pointer-safe ornament margins, functional type, declared-paper
contrast and real financial flows are covered. See [evidence and limits](verification/README.md).

Prepared funding, equipment, food stock, learned recipes and nominated Court/rider
demand are explicit fixture inputs. The lab does not forecast live demand,
profit, progression or player time, and does not fabricate final happy departures.
Physical Fold 7 GPU, Android file-provider and Bluetooth-controller behavior remain
outside this lab's emulated checks.
