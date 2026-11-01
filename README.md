# Pumpkin Patch: late-game contractor support

This is an independent review pack, not a playable-game update.
The current game and player saves are unchanged.

Open Pumpkin-Patch-Late-Game-Workshop.html after extracting the workshop ZIP.
It embeds three real animated voxel props, six painted icons, three proposed
Festival Night briefs and the actual eighteen-case attraction-capacity audit.
The proposed evenings, cosmetic grants and balance changes are not installed.

Claude pickup: read HANDOVER.md. Apply late-game-support.patch with
`git apply --check` before `git apply`, or copy `files/voxel/docs/contractor-patches/late-game-support/` to
the same repository path. Choose one method. No other folders are changed.
Do not merge earlier sprite history or reset Claude's unpublished work.

Source branch: contractor/late-game-support-pack
Source commit: 855f29cc7969883268c6313b13eee06e4339a6f8
Patch review base: f2f96f8351dea4cf6072862b1e3e0b14d6a318dc
Current lead application checked: f2f96f8351dea4cf6072862b1e3e0b14d6a318dc

All six native test files pass. The exact workshop passes 139
browser assertions, including phone/unfolded/landscape layouts, actual touch
pinch and context-loss recovery. There are no page errors or external requests.
These emulations are not a physical Fold 7 GPU or Bluetooth test.
An actual applied-patch rebuild on the current lead, and a clean committed-source
rebuild, match the reviewed workshop and both emitted reports exactly.
The production game rebuild matches a clean build of that lead byte for byte.
See REBUILD-VERIFICATION.json and the source folder's verification evidence.

Preview SHA-256: 6e836a015a9ba6101fef7fb939593bbaf45c6a4d6ae0e4b13c761ed890c1d035
Patch SHA-256: e3075e80c3f00283292e6c635a34eb92d997698ba327dbec36e7dc2430570eb6
