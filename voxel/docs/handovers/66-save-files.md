# 66 — Save files that load into every future version

Branch: `voxel-reference` (lead), following handover 65. The player asked: "Create a better save feature which exports a file to load into future versions".

## Why

The farm saved only to the browser's storage. A new version of the game is a new HTML file, and on a phone opened from Downloads it usually gets its own storage, so a new version started from scratch. The old way out was Copy a backup, which put a long line of text on the clipboard.

## What it is

**The save file** (`src/save-file.js`, pure, no DOM):

- `buildSaveFile(state, { prefs, savedAt, build })` wraps `saveData` in a fixed envelope:
  - `format: "pumpkin-patch-voxel-save"`;
  - `fileVersion` (1);
  - `stateVersion` (the game's `STATE_VERSION`);
  - `savedAt`, `build` and `prefs`, kept for the record;
  - a `summary` (level, coins, plots, house level, play time) to show before loading;
  - a `checksum` (FNV-1a over the state's JSON);
  - and `state`.
- `readSaveFile(text)` takes a file's text and returns `{ ok: false, reason }` or `{ ok: true, state, summary, savedAt, version, newer, edited, legacy }`.
  - It goes through `restoreState`, so a file from any earlier build migrates as a stored save always has.
  - It reads a bare text backup (the old Copy a backup) too, and a byte-order mark or pretty printing is fine.
  - `newer` marks a file a later build wrote: it loads what this build understands.
  - `edited` marks a checksum that no longer matches: it still loads, with a warning.
  - Anything else is turned away with a reason.
- `saveFileName` gives `pumpkin-patch-level-8-2026-11-04-1730.json`.
- **The envelope is a contract.** Never rename or drop its fields. If it has to change, raise `SAVE_FILE_VERSION` and keep reading the older shape.

**In the game** (`src/ui/save-files.js`, Settings → Your farm's save):

- **This farm** shows its level, coins, plots and house, and when it was last saved to a file.
- **Save to a file:**
  - Desktop Chrome and Edge get the system's save dialog (`showSaveFilePicker`).
  - Phones get a download (to Downloads on Android).
  - **Share…** appears where the device can share files (Drive, Files, a chat).
- **Load a save file** reads the chosen file and shows a card before anything changes:
  - what's in it and when it was saved;
  - warnings for a newer or edited file;
  - the farm it would replace.
- **Load this farm.** The farm here, as it is now, is kept first (`<save key>-before-load`). **Undo the last load** brings it back.
- **Start a new patch** goes the same way, so a reset can be undone too.
- **Settings stay with the device.** A file carries them for the record, but loading one leaves this device's own (sound, graphics, TV mode).
- **Backup as text** (copy or paste) is still there, folded away. A pasted backup shows the same card before it loads.
- **The controller.** A file picker opens only from a tap or a click, so on a controller the game says to tap the button.
- **A nudge.** A farm with some progress and no file saved for a week gets one notice, at most once a day, pointing to Save to a file.

## Keeping future versions honest

- `test/fixtures/save-file-v1-state16.json` is a real file saved from a staged mid-game farm: level 8, £47,410, nine plots, house level 2, furniture, the food truck and stock.
- `test/save-file.test.mjs` loads every `save-file-v*-state*.json` there and checks its coins, plots, house, furniture, truck and stock, and that its level hasn't dropped. Every later build's CI runs it, so a change that stops today's files loading fails.
- When `STATE_VERSION` or `SAVE_FILE_VERSION` changes, run `node tools/save-fixture.mjs` to add that version's file. It never rewrites an old one: the old files are the point.

## Checking

- **699 unit tests pass.** `test/save-file.test.mjs` is new: round trip, edited and newer files, text backups, junk with reasons, the checksum, the name and the kept files.
- **The smoke test passes.**
- **`dist/qa/save-qa.mjs`** (ignored) was run at phone size. It:
  - saves a farm to a file (a real download);
  - loads it into a fresh game in another browser profile, standing in for a new version or another device;
  - checks the card;
  - loads it (coins, furniture and house level match);
  - undoes the load;
  - and turns away a file that isn't a save.
  - Playwright's touch emulation stops it catching the file picker, so it runs without touch.

## Not done yet

As in 65: the NPC village (data drafted, rules next), the farm round, and the tractor engine on the farm.
