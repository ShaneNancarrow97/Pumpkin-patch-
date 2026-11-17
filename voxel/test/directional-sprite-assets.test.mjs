import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const exec = promisify(execFile), root = fileURLToPath(new URL("../", import.meta.url));
const baker = join(root, "tools/bake-directional-sprites.py");
const directions = ["front", "frontRight", "right", "backRight", "back", "backLeft", "left", "frontLeft"];
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const configFor = (id = "fixture") => ({ version: 1, characters: [{ id, source: `${id}.png`, approved: true, grid: { columns: 8, rows: 8 }, directions: [...directions], height: 2.3 }] });

// Artificial shapes exercise cropping and scaling only. They are never game art.
async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), "directional-art-test-"));
  await exec("python3", ["-c", String.raw`
from PIL import Image,ImageDraw
from pathlib import Path
import sys
p=Path(sys.argv[1])/'assets/directional-sprite-concepts';p.mkdir(parents=True)
atlas=Image.new('RGBA',(640,800))
for row in range(8):
 for col in range(8):
  frame=Image.new('RGBA',(80,100));d=ImageDraw.Draw(frame)
  d.rectangle((30,14,50,60),fill=(100+row*15,70+col*15,100,255))
  d.rectangle((25+col,61,31+col,88),fill=(70,50,40,255))
  d.rectangle((45-col,61,51-col,88),fill=(90,50,40,255))
  d.rectangle((19,33,29,38+row),fill=(90,30,40,255))
  atlas.alpha_composite(frame,(col*80,row*100))
atlas.save(p/'fixture.png')
`, dir]);
  const configPath = join(dir, "assets/directional-sprite-concepts/manifest.json");
  await writeFile(configPath, JSON.stringify(configFor()));
  return { dir, configPath, bake: () => exec("python3", [baker, "--root", dir]) };
}

test("directional baker retains one root and one scalar across all 64 authored frames", async () => {
  const f = await fixture();
  try {
    await f.bake();
    const manifest = JSON.parse(await readFile(join(f.dir, "assets/directional/manifest.json"))), character = manifest.characters.fixture;
    assert.deepEqual(manifest.cell, { w: 128, h: 176, ax: 64, ay: 164 });
    assert.deepEqual(character.directions, directions);
    assert.equal(character.frames.length, 64);
    assert.equal(character.runtime.rgbaBytes, 1024 * 1408 * 4);
    assert.ok(character.rows <= 145);
    for (let i = 0; i < 64; i++) {
      const frame = character.frames[i];
      assert.equal(frame.direction, directions[Math.floor(i / 8)]);
      assert.equal(frame.contactLeg, i % 8 === 0 ? "left" : i % 8 === 4 ? "right" : null);
      assert.deepEqual(frame.anchor, [64, 164]);
      assert.deepEqual(frame.sourceAnchor, [40, 89]);
      for (const axis of [0, 1]) assert.ok(Math.abs(frame.resizeDimensions[axis] / frame.resizeSourceBox[axis + 2] - character.sharedScale) < 1e-12);
      assert.ok(frame.outputAlphaBounds[0] > 0 && frame.outputAlphaBounds[1] > 0 && frame.outputAlphaBounds[2] < 128 && frame.outputAlphaBounds[3] < 176);
    }
    const sheet = await readFile(join(f.dir, character.runtime.file));
    assert.equal(sha(sheet), character.runtime.sha256);
    const meta = await readFile(join(f.dir, "src/content/directional-sprite-meta.js"), "utf8");
    const moduleText = meta.replace(/import (sheet\d+) from "([^"]+)";/g, (_, name, path) => `const ${name} = ${JSON.stringify(path)};`);
    const { DIRECTIONAL_SPRITES } = await import("data:text/javascript;base64," + Buffer.from(moduleText).toString("base64"));
    assert.deepEqual(DIRECTIONAL_SPRITES.fixture.walk, Array.from({ length: 8 }, (_, row) => Array.from({ length: 8 }, (_, phase) => row * 8 + phase)));
    assert.equal(DIRECTIONAL_SPRITES.fixture.frames.length, 64);
    assert.deepEqual(DIRECTIONAL_SPRITES.fixture.frames[63], { x: 896, y: 1232, w: 128, h: 176, ax: 64, ay: 164 });
    await f.bake();
    assert.equal(sha(await readFile(join(f.dir, character.runtime.file))), sha(sheet), "repeat baking preserves pixels and encoding");
    assert.ok((await stat(join(f.dir, "assets/directional/fixture-contact.jpg"))).size > 0);
    const preview = await readFile(join(f.dir, "assets/directional/preview.html"), "utf8");
    assert.match(preview, /requestAnimationFrame/);
    assert.match(preview, /left-contact/);
  } finally { await rm(f.dir, { recursive: true, force: true }); }
});

test("unapproved and incomplete direction declarations cannot overwrite accepted art", async () => {
  const f = await fixture();
  try {
    await f.bake();
    const output = join(f.dir, "assets/directional/fixture.webp"), accepted = sha(await readFile(output));
    for (const mutate of [c => { c.characters[0].approved = false; }, c => { c.characters[0].directions[7] = "front"; }, c => { c.characters[0].grid.columns = 4; }, c => { c.characters[0].sourceAnchors = [[0, 0]]; }]) {
      const config = configFor(); mutate(config); await writeFile(f.configPath, JSON.stringify(config));
      await assert.rejects(f.bake(), /Directional bake rejected/);
      assert.equal(sha(await readFile(output)), accepted);
    }
  } finally { await rm(f.dir, { recursive: true, force: true }); }
});

test("missing, duplicated and clipped painted poses are rejected before publication", async () => {
  const f = await fixture();
  try {
    await f.bake();
    const source = join(f.dir, "assets/directional-sprite-concepts/fixture.png"), original = await readFile(source);
    const output = join(f.dir, "assets/directional/fixture.webp"), accepted = sha(await readFile(output));
    for (const kind of ["empty", "duplicate", "edge"]) {
      await writeFile(source, original);
      await exec("python3", ["-c", String.raw`
from PIL import Image
import sys
p,kind=sys.argv[1:];im=Image.open(p).convert('RGBA')
if kind=='empty':im.paste((0,0,0,0),(0,0,80,100))
elif kind=='duplicate':im.paste(im.crop((0,0,80,100)),(80,0))
else:
 for x in range(31):im.putpixel((x,40),(255,255,255,255))
im.save(p)
`, source, kind]);
      await assert.rejects(f.bake(), /Directional bake rejected/);
      assert.equal(sha(await readFile(output)), accepted, kind + " does not replace the accepted output");
    }
  } finally { await rm(f.dir, { recursive: true, force: true }); }
});

test("explicit uneven cuts and measured torso roots preserve the same output grid", async () => {
  const f = await fixture();
  try {
    const rows = [0, 101, 202, 300, 403, 500, 601, 700, 800], columns = [0, 81, 160, 241, 320, 400, 481, 560, 640];
    const config = configFor();
    Object.assign(config.characters[0], { rowEdges: rows, columnEdges: columns, sourceAnchors: Array.from({ length: 64 }, () => [40, 89]) });
    await exec("python3", ["-c", String.raw`
from PIL import Image
from pathlib import Path
import json,sys
p=Path(sys.argv[1])/'assets/directional-sprite-concepts/fixture.png';old=Image.open(p).convert('RGBA');new=Image.new('RGBA',old.size)
rows=json.loads(sys.argv[2]);cols=json.loads(sys.argv[3])
for row in range(8):
 for col in range(8):
  cell=old.crop((col*80,row*100,(col+1)*80,(row+1)*100));new.alpha_composite(cell,(cols[col],rows[row]))
new.save(p)
`, f.dir, JSON.stringify(rows), JSON.stringify(columns)]);
    await writeFile(f.configPath, JSON.stringify(config));
    await f.bake();
    const manifest = JSON.parse(await readFile(join(f.dir, "assets/directional/manifest.json"))), char = manifest.characters.fixture;
    assert.deepEqual(char.source.rowEdges, rows);
    assert.deepEqual(char.source.columnEdges, columns);
    for (let i = 0; i < 64; i++) {
      const frame = char.frames[i], row = Math.floor(i / 8), col = i % 8;
      assert.deepEqual(frame.sourceBox, [columns[col], rows[row], columns[col + 1], rows[row + 1]]);
      assert.deepEqual(frame.sourceAnchor, [40, 89]);
      assert.deepEqual(frame.anchor, [64, 164]);
    }
    config.characters[0].rowEdges[2] = config.characters[0].rowEdges[1];
    await writeFile(f.configPath, JSON.stringify(config));
    await assert.rejects(f.bake(), /rowEdges must contain nine increasing integer cuts/);
  } finally { await rm(f.dir, { recursive: true, force: true }); }
});

const runtimeManifest = join(root, "assets/directional/manifest.json");
test("shipped directional textures match approved source provenance, metadata and cell bounds", { skip: !existsSync(runtimeManifest) && "No approved directional paintings imported yet" }, async () => {
  const manifest = JSON.parse(await readFile(runtimeManifest));
  assert.equal(manifest.coverage.angleStepDegrees, 45);
  assert.equal(manifest.coverage.mirroredDirections, false);
  assert.equal(manifest.coverage.idleAuthored, false);
  const metaPath = join(root, "src/content/directional-sprite-meta.js"), text = await readFile(metaPath, "utf8");
  const moduleText = text.replace(/import (sheet\d+) from "([^"]+)";/g, (_, name, path) => `const ${name} = ${JSON.stringify(path)};`);
  const { DIRECTIONAL_SPRITES } = await import("data:text/javascript;base64," + Buffer.from(moduleText).toString("base64"));
  assert.deepEqual(Object.keys(DIRECTIONAL_SPRITES).sort(), Object.keys(manifest.characters).sort());
  const { stdout } = await exec("python3", ["-c", String.raw`
from PIL import Image
from pathlib import Path
import json,sys
root=Path(sys.argv[1]);manifest=json.loads((root/'assets/directional/manifest.json').read_text());out={}
for ident,character in manifest['characters'].items():
 im=Image.open(root/character['runtime']['file']).convert('RGBA');frames=[]
 for i in range(64):
  cell=im.crop((i%8*128,i//8*176,(i%8+1)*128,(i//8+1)*176));a=cell.getchannel('A');b=a.point(lambda v:255 if v>=108 else 0)
  frames.append({'alpha':a.getbbox(),'body':b.getbbox()})
 out[ident]={'size':im.size,'frames':frames}
print(json.dumps(out))
`, root], { maxBuffer: 2 * 1024 * 1024 });
  const decoded = JSON.parse(stdout);
  for (const [id, character] of Object.entries(manifest.characters)) {
    assert.equal(character.approved, true, id);
    assert.equal(sha(await readFile(join(root, character.source.file))), character.source.sha256, id + " original source");
    assert.equal(sha(await readFile(join(root, character.runtime.file))), character.runtime.sha256, id + " runtime WebP");
    assert.equal(character.frames.length, 64);
    assert.deepEqual([...character.directions].sort(), [...directions].sort());
    assert.equal(new Set(character.frames.map(f => f.sourcePixelHash)).size, 64, id + " has 64 distinct source images");
    assert.deepEqual(decoded[id].size, [1024, 1408]);
    const meta = DIRECTIONAL_SPRITES[id];
    assert.deepEqual(meta.directions, character.directions);
    assert.equal(meta.rows, character.rows);
    assert.equal(meta.height, character.height);
    assert.equal(meta.locomotion, character.locomotion);
    assert.equal(meta.frames.length, 64);
    for (let i = 0; i < 64; i++) {
      const frame = character.frames[i], bounds = decoded[id].frames[i];
      assert.deepEqual(bounds.alpha, frame.outputAlphaBounds, id + " actual alpha frame " + i);
      assert.deepEqual(bounds.body, frame.outputBodyBounds, id + " actual body frame " + i);
      assert.deepEqual([meta.frames[i].ax, meta.frames[i].ay], [64, 164]);
      assert.ok(bounds.alpha[0] > 0 && bounds.alpha[1] > 0 && bounds.alpha[2] < 128 && bounds.alpha[3] < 176);
      assert.equal(meta.walk[Math.floor(i / 8)][i % 8], i);
      if (character.locomotion === "float") {
        assert.equal(frame.contactLeg, null, id + " has no fabricated foot contacts");
        assert.equal(frame.sourceAnchor[1], character.frames[Math.floor(i / 8) * 8].sourceAnchor[1], id + " retains its authored floating bob");
      }
    }
  }
});
