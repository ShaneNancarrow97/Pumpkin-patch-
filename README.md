# Pumpkin Patch — cooking and deliveries

## Play

Extract **Pumpkin-Patch-HTML.zip** and open **Pumpkin-Patch.html** in Chrome or Safari. It is the full standalone game: assets, music and fonts are embedded. No server, install or APK is required. The game's fullscreen button is retained.

Open **More → Cooking** or **Upgrades → Cooking**. At patch level 5 you may buy the Midnight Kitchen food truck for £900. Order ingredients, wait for its north-road cart, then cook real ingredients and unreserved pumpkins into food. Pick food and prices for the two wall cabinets inside Skyla's shop. Hungry customers spend their existing money; food income has its own accounts. A later paid chef can repeat supplied recipes. A placed copper range in the unlocked home kitchen provides a second station.

This also includes the preceding Hollow House exterior upgrade, Claude's published wilds, hayride and current twelve-level progression. It preserves existing saves through additive schema 12. Browser/app/file origins may differ, so use the game's save export/import when moving between files or apps. Claude's unpublished twenty-level economy is not included.

## Claude contractor handover

Source `121f4cdbb85770de38c3860c2e51647f8bd2c921` on **contractor/cooking-foundation**. Runtime CI proof targets `ba99b87a5a6d7a94e8ba584d32fca42970828c30`. Read **44-cooking-and-deliveries.md** and the repository verification folder.

The artifact branch **contractor/cooking-download-2026-10-26** contains downloads only; do not merge it into the game source. Choose exactly one patch:

- **cooking-from-5083446.patch** is incremental cooking work on completed exterior base `5083446e1ffcc94f370feff0e533150899c771f3`. Use if handover 43 is already incorporated.
- **exterior-and-cooking-from-3f92ca8.patch** includes both exterior and cooking against Claude's last published `3f92ca8df92e07b09445ce092101e9309c00288c`. Use only if neither increment is incorporated.

Do not apply both patches. Preserve Claude's private work and reconcile shared integration files and twenty-level gates deliberately; do not reset the lead workspace.

```sh
git apply --check /path/to/chosen.patch
git apply /path/to/chosen.patch
npm --prefix voxel ci
npm --prefix voxel test
node voxel/build.mjs --out /tmp/pumpkin-cooking.html
```

Validation: 67 Node test files pass; 44 full gameplay/browser checks pass on their pinned pre-ground-polish build; 8 focused final visual checks pass on the exact download. Final CI passes the unchanged standard 48-check desktop/phone smoke suite. No browser runtime errors or external asset requests. Clean patch rebuild is byte-identical. Changes after the full browser flow are the matching cobble apron/woodland exclusion and Shane waiting at the receiving bay until parcel credit. The intermediate ground-polish build also passes 9 visual checks; physical end-to-end receiver timing was code-reviewed rather than browser fast-forwarded.

Phone, landscape and unfolded Fold viewport layouts were tested in managed Chromium. Physical Z Fold frame rate, Android file handlers and successful native OS fullscreen remain unverified; managed policy blocks direct file navigation/fullscreen, so automated tests served the unchanged HTML on loopback.

HTML SHA-256: `e8601b62048df0df52e035fc332c4b080d612ea6fb52d6a986d9c362b49c5ecf`.
