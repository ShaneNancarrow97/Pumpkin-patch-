# Adding an outfit

Every outfit needs four images and three code entries. `npm test` checks all of it (`test/outfits.test.mjs`), so a mistake fails the build rather than reaching a player. Copy an existing outfit such as `shane-slasher` and change only what differs.

## 1. The art

All images are WebP with a **transparent background**. The character is in **front three-quarter view**, matching the existing outfits, at the same size and proportions as the original Shane or Natalie.

| File | Layout | Size |
| --- | --- | --- |
| `assets/house/<id>-walk.webp` | 6 walking frames, 3 across × 2 down, in this order: frames 1, 2 and 3 on the top row, then 4, 5 and 6 | 960 × 704 (frames 320 × 352) |
| `assets/house/<id>-idle.webp` | 3 standing frames in a row: rest, half-blink, blink | 960 × 352 (frames 320 × 352) |
| `assets/house/<id>-walk-preview.webp` | The 6 walking frames, trimmed tighter, same 3 × 2 grid | 3 × frame width by 2 × frame height, every frame the same size |
| `assets/house/<id>-idle-preview.webp` | The 3 standing frames, trimmed tighter, in a row | 3 × frame width by 1 × frame height |

**Frame rules.** These keep the feet from sliding and the outfits lined up:

- **The feet touch the ground at the same point in every frame:** x = 160, y = 344 within the 320 × 352 frame. That point is the `anchor` in the metadata.
- **The character's height** from heel to top of head is about 320 pixels (`referenceHeight`). Hats can go higher, up to the top of the frame.
- **Clothes move with the body** in every walking frame. Trousers, skirts, coats and shoes follow the legs; nothing stays still while the feet move.
- **Nothing from a neighbouring frame bleeds in.** Leave a few transparent pixels around each figure.
- **Keep the faces, hair and glasses recognisably Shane and Natalie.** Start from the original outfits (`<character>-base-walk.webp`) as the pose reference.

`<id>` is the character, a hyphen, then a short name in lowercase, such as `natalie-pirate` or `shane-werewolf`. **Never rename or remove an existing id.** Saves store these ids, and players would lose an outfit they paid for.

## 2. The code

**`src/core/costume-model.mjs`:** add an entry to `costumeCatalog`.

```js
{ id: "natalie-pirate", collection: "90s-horror", character: "natalie", name: "Moonlit pirate", price: 900,
  description: "A tricorn hat, a striped sash and a treasure map to the pumpkin patch.",
  row: null, artpath: "assets/house/natalie-pirate-idle.webp" }
```

- `row: null` and `artpath` pointing at the standing sheet is the format for new outfits. (`row` numbers belong to the older combined costume sheets.)
- `collection` is optional. Only `"90s-horror"` has a filter in the wardrobe today. A new collection also needs an `<option>` in the `costume-collection` select in `src/ui/costume-ui.js`, its value accepted in that select's `onchange`, and a line added to `COLLECTIONS` in `test/outfits.test.mjs`.
- Prices so far run from £80 to £1,200. The balance plan (docs/PLAN.md, Phase 2) will rescale them, so pick something in that range relative to similar outfits.
- Write the name and description in the game's voice: warm, a little dry, UK English.

**`src/content/character-walk-meta.mjs`:** add an entry to both objects, copied from an existing outfit with the paths and preview frame sizes changed.

```js
// in characterWalkMeta
"natalie-pirate": { "path": "assets/house/natalie-pirate-walk.webp", "frameWidth": 320, "frameHeight": 352, "width": 960, "imageHeight": 704, "referenceHeight": 320, "anchor": [160, 344], "rects": [[0, 0, 320, 352], [320, 0, 320, 352], [640, 0, 320, 352], [0, 352, 320, 352], [320, 352, 320, 352], [640, 352, 320, 352]], "facing": "front-three-quarter", "preview": { "path": "assets/house/natalie-pirate-walk-preview.webp", "frameWidth": 211, "frameHeight": 328 } },
// in characterIdleMeta
"natalie-pirate": { "path": "assets/house/natalie-pirate-idle.webp", "frameWidth": 320, "frameHeight": 352, "width": 960, "imageHeight": 352, "referenceHeight": 320, "anchor": [160, 344], "rects": [[0, 0, 320, 352], [320, 0, 320, 352], [640, 0, 320, 352]], "facing": "front-three-quarter", "preview": { "path": "assets/house/natalie-pirate-idle-preview.webp", "frameWidth": 185, "frameHeight": 328 } },
```

The preview `frameWidth` and `frameHeight` are the preview file's width ÷ 3 and its height (÷ 2 for the walking preview).

## 3. Check it

```sh
npm test          # outfit tests: files exist, sizes match, frames line up
npm run build     # the outfit is inlined into dist/pumpkin-patch.html
npm run smoke     # the game still starts with no errors
npm run dev       # look at it: Outfits → the new card, Standing and Walking previews,
                  # then buy it, wear it and watch it walk on the patch
```

Look at it walking on the patch before committing. Check that the feet don't slide or float, and that nothing flickers between frames.

No save change is needed: new outfit ids are just new entries in the wardrobe the save already has.
