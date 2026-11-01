# Pumpkin Patch: Festival Night module and dependency matrix

This is an independent review pack, not a playable-game update.
The current game and player saves are unchanged.

Open Pumpkin-Patch-Festival-Nights.html after extracting the demo ZIP.
It exercises the actual standalone session module with explicitly synthetic
outcomes. Preparation, pause, three-of-four goals, replay protection, JSON saves
and once-only cosmetic entitlements work in the demo. Live integration and
balancing of proposed targets remain Claude's work.

Claude pickup: read HANDOVER.md and DEPENDENCY-MATRIX.md. Choose the incremental
patch after the previous support pack, or the combined patch on the declared
lead. Run `git apply --check` before `git apply`. Do not apply both patches.
The files/ copy of the new folder also requires the previous support pack.
The combined patch adds only the two isolated contractor folders.
Do not merge earlier sprite history or reset Claude's unpublished work.

Source branch: contractor/festival-session-module
Source commit: fd58d75c1ac27ecf4f912acdf78bde07a176526c
Patch review base: 855f29cc7969883268c6313b13eee06e4339a6f8
Current lead application checked: f2f96f8351dea4cf6072862b1e3e0b14d6a318dc

All 81 native assertion cases across 13 test files
pass, including the previous support pack. The exact demo passes 80
browser assertions, including phone/unfolded/landscape layouts, real module UI,
pause/replay/recovery and once-only claims. No page errors or external requests.
These emulations are not a physical Fold 7 GPU or Bluetooth test.
Actual applied-patch rebuilds on both declared bases and a clean source rebuild
match the reviewed demo exactly. Parsed import checks keep the module outside
the live entry's import tree; the semantic matrix records wider gameplay risks.
The production game rebuild matches a clean build of that lead byte for byte.
See REBUILD-VERIFICATION.json and the source folder's verification evidence.

Preview SHA-256: f0cdeafa73ec624e34e790a40379e86c7d580f88820e9dcec9ef706ff960499b
Patch SHA-256: a46c922044d6f6ad4ea92ecef4e5495017105cb726945121599923c0098a4cc2
