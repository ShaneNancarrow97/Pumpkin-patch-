# Hayride upgrade icon menu verification

All **111 checks pass**. There are no page/console errors or external runtime requests. All twelve authored icon crops decode and draw nonblank, distinct pixels through the actual menu's CSS.

This is a **menu-only harness**, separate from the playable game. It bundles the real `hayrideSheets` module, calls its real bound purchase/toggle handlers against the actual pure model/rules, uses the complete `index.html` shell, and loads every stylesheet in `build.mjs` order with the game's embedded fonts. It does not initialize the main game loop, renderer, 3D picking or sound. Chromium runs with GPU disabled, and the harness refuses WebGL context creation. Importing the shared model brings in Three.js math helpers; their package input hash is recorded separately.

The fixture deliberately supplies finite test funds, prepared prerequisites and claimed levels. It does not claim a player earned those levels through normal gameplay. Test progression covers level10 locked purchase, the level11 purchase, level13 and level16 attraction tiers, both crew tiers, the second tractor, both route extensions, all five scares and free owned-scare toggles. Prices, insufficient-funds gates, pause gates and ticket setting behavior remain intact. The purchase sequence starts at £120,000 and ends at £37,300, with no ticket income, admissions or guests created by the menu.

## Exact inputs and evidence

- Harness HTML: `actual-menu-fixture.html`
- Harness SHA-256: `fed5379e7400af9f717e35f8387609258ac005f99ac1ea6ce098c02a6cf583a1`
- Report: `checks.json`
- Source hashes: 142 repository-relative paths, including the actual menu, helper, map, atlas, rules, model graph, shell, all CSS, fonts, package lock and QA script.
- Dependency hashes are separate from Git source hashes; the package lock pins their versions.
- Screenshots: 16 captures covering desktop purchase/scare cards and phone390×844, Fold874×787 and landscape844×390 upgrade/scare panes at top and bottom scroll positions.

The harness hash is **not the playable-game hash**. The parent release runs game and native checks separately. `sourceHashes` can be compared with the final Git tree before packaging this evidence.

All tested layouts keep the sheet within the viewport, avoid horizontal overflow, retain44px button targets and keep icon/text/price rows from overlapping. In narrow landscape panes, purchase buttons intentionally wrap below their text and align right. Visual inspection confirms the twelve icon concepts are clear and correctly assigned, body text remains legible, and gold prices are easy to identify. Sticky service navigation and sheet appearance are the existing game's styling; this patch changes the icon art and its compact row wrappers.

## Reproduce

From the repository root, with dependencies installed in `voxel/`:

```sh
CHROMIUM_PATH=/usr/bin/chromium node voxel/tools/qa-hayride-icons.mjs /tmp/hayride-icon-menu-review
```

The tool serves the exact self-contained fixture on localhost because managed Chromium may disallow local file URLs. All other HTTP origins are blocked. It writes the fixture, source hashes, checks and screenshots to the supplied directory. No full-size source-generation PNG is imported into the fixture bundle.
