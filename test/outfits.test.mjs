import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { costumeCatalog } from "../src/core/costume-model.mjs";
import { characterIdleMeta, characterWalkMeta } from "../src/content/character-walk-meta.mjs";
import { imageSize } from "./helpers/image-size.mjs";

const root = new URL("../", import.meta.url);
const file = (p) => new URL(p, root);
const COLLECTIONS = [undefined, "90s-horror"];

test("outfit ids are unique, named for their character and never renamed", () => {
  const ids = costumeCatalog.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const c of costumeCatalog) {
    assert.ok(["natalie", "shane"].includes(c.character), c.id);
    assert.ok(c.id.startsWith(c.character + "-"), `${c.id} starts with ${c.character}-`);
    assert.ok(Number.isSafeInteger(c.price) && c.price >= 0, `${c.id} price`);
    assert.ok(c.name && c.description, `${c.id} has a name and description`);
    assert.ok(COLLECTIONS.includes(c.collection), `${c.id}: collection "${c.collection}" needs a wardrobe filter (see docs/ADDING-OUTFITS.md)`);
  }
  // Saves store these ids. Renaming or removing one silently takes the outfit away from players.
  for (const id of ["natalie-base", "natalie-witch", "natalie-ghostbride", "natalie-batqueen", "shane-base", "shane-vampire", "shane-skeleton", "shane-scarecrow", "natalie-vampire", "natalie-frankenstein", "natalie-mummy", "natalie-slasher", "shane-frankenstein", "shane-mummy", "shane-slasher"])
    assert.ok(ids.includes(id), `existing outfit ${id} must stay`);
});

test("every outfit has walking art", () => {
  for (const c of costumeCatalog) assert.ok(characterWalkMeta[c.id], `${c.id} needs a characterWalkMeta entry`);
});

// Checks one sheet and its preview against their metadata.
function checkSheet(id, kind, meta, columns, rows) {
  const where = `${id} ${kind}`;
  assert.ok(fs.existsSync(file(meta.path)), `${where}: missing ${meta.path}`);
  const size = imageSize(file(meta.path));
  assert.deepEqual(size, { width: meta.width, height: meta.imageHeight }, `${where}: sheet size`);
  assert.equal(meta.frameWidth * columns, meta.width, `${where}: ${columns} columns`);
  assert.equal(meta.frameHeight * rows, meta.imageHeight, `${where}: ${rows} rows`);
  assert.equal(meta.rects.length, columns * rows, `${where}: frame count`);
  meta.rects.forEach(([x, y, w, h], i) => {
    assert.deepEqual([x, y, w, h], [(i % columns) * meta.frameWidth, Math.floor(i / columns) * meta.frameHeight, meta.frameWidth, meta.frameHeight], `${where}: frame ${i} rect`);
  });
  assert.ok(meta.anchor[0] > 0 && meta.anchor[0] < meta.frameWidth && meta.anchor[1] > 0 && meta.anchor[1] <= meta.frameHeight, `${where}: anchor inside the frame`);
  if (meta.preview) {
    assert.ok(fs.existsSync(file(meta.preview.path)), `${where}: missing preview ${meta.preview.path}`);
    const p = imageSize(file(meta.preview.path));
    assert.deepEqual(p, { width: meta.preview.frameWidth * columns, height: meta.preview.frameHeight * rows }, `${where}: preview is ${columns}×${rows} frames of ${meta.preview.frameWidth}×${meta.preview.frameHeight}`);
  }
}

test("walking sheets match their metadata: 6 frames in 3 × 2", () => {
  for (const [id, meta] of Object.entries(characterWalkMeta)) checkSheet(id, "walk", meta, 3, 2);
});

test("standing sheets match their metadata: 3 frames in a row", () => {
  for (const [id, meta] of Object.entries(characterIdleMeta)) checkSheet(id, "idle", meta, 3, 1);
});

test("new-style outfits use their standing sheet as wardrobe art", () => {
  for (const c of costumeCatalog.filter((c) => c.row === null && c.price > 0)) {
    assert.ok(characterIdleMeta[c.id], `${c.id} needs a characterIdleMeta entry`);
    assert.equal(c.artpath, characterIdleMeta[c.id].path, `${c.id}: artpath is its standing sheet`);
  }
});
