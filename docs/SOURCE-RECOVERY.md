# How the source was recovered

The original `src/` project behind `npm run build` was not available. What was available was the shipped game, `assets/index.html` inside `Pumpkin_Patch_Midnight.apk` (Midnight 2.10). This tree was rebuilt from that file with `tools/recover-source.mjs`.

## What the shipped file contained

The shipped file is a 27.8 MB HTML page holding:

- one `<style>` block, with the DM Sans font and two images inlined as base64
- the page markup, with 26 icons, the farm map, the logo and the music track inlined as base64
- `globalThis.PumpkinPatchAssets`, a map of 143 asset paths (`assets/house/…`, `assets/ui/…`) to base64 data, which `asset(path)` in `src/platform/assets.js` reads
- an esbuild IIFE bundle that still has a `// src/<path>` comment in front of each of its 49 modules

## What the tool does

1. It decodes every asset in the map to a real file at its original path. It also writes the five media files that only appeared inline, under names chosen for them:

   | Asset | Recovered name |
   | --- | --- |
   | Logo | `assets/ui/logo.svg` |
   | Sprout | `assets/house/sprout.svg` |
   | Character sheet | `assets/house/character-atlas.webp` |
   | Music | `assets/audio/moonlit-waltz.mp3` |
   | Font | `assets/fonts/dm-sans.woff` |

2. It replaces every inline `data:` URI in the HTML, CSS and JS with the matching `assets/…` path, matching identical files by content hash. The character sheet had been inlined four times and is now one file.
3. It splits the bundle back into modules at the `// src/…` comments and removes the two-space indent that the bundle wrapper added. Text inside template literals is left untouched.
4. It runs scope analysis on each module to find the top-level names it uses from other modules. From that it writes the `import { … } from "…"` and `export { … }` lines that esbuild had removed.
5. `.ts` files become `.js`, because the bundle no longer contained their types.

## What could not be recovered

- **TypeScript types and interfaces.** `content/economy`, `content/products`, `content/shop`, `content/stall`, `core/inventory`, `core/shop`, `core/stall`, `core/commands`, `core/clock`, `platform/storage`, `scene/room-geometry` and `scene/shop-layout` were TypeScript. They are now plain JavaScript with the same behaviour.
- **Most comments.** esbuild keeps only some of them.
- **Some original names.** When two modules used the same local name, esbuild renamed one of them, so the source has names like `level2`, `count3` and `app2`. They are safe to rename by hand.
- **`const` and `let` at the top of a module.** These were turned into `var`.
- **The original build settings.** `scripts/build.mjs` is new and produces the same kind of single file.

## How it was checked

- `npm run smoke` passes on both the shipped APK page and the rebuilt `dist/pumpkin-patch.html`. The test starts the game, checks every image decodes, plants, boosts, harvests, saves and opens each main tab, with no console errors.
- Screenshots of the shipped and rebuilt games at 1280×800 match, apart from the animation frame.
- A save from the shipped 2.10 build and one from the 2.8 HTML file are kept as fixtures, and `npm test` loads both.
- Running `tools/recover-source.mjs` on the APK page again reproduces `src/` and `assets/` byte for byte.

## Recovering a newer build

If a newer single-file build turns up, such as 2.16, run:

```sh
npm i --no-save acorn eslint-scope@8
node tools/recover-source.mjs path/to/Pumpkin_Patch.html /tmp/recovered
diff -r /tmp/recovered/src src
```

The tool prints any inline media it doesn't recognise. Those land in `assets/inline/`, and you can rename them. Copy the result over `src/` and `assets/`, add a save from that build to `test/fixtures/`, and run `npm run check`.
