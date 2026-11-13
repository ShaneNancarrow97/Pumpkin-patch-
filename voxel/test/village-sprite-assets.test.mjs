import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { validVillageSprite, villageFrameShape, villageSpritePose } from "../src/village-sprite-math.js";

const ids = ["elowen", "rowan", "vesper", "mabel", "tansy", "opal", "cinder", "corvus", "baron"];
const root = new URL("../", import.meta.url);
const metaURL = new URL("src/content/village-sprite-meta.js", root);
// Preserve the real import paths while loading metadata without a browser loader.
const moduleText = readFileSync(metaURL, "utf8").replace(/import\s+(\w+)\s+from\s+["']([^"']+\.webp)["'];?/g, (_, name, path) => `const ${name} = ${JSON.stringify(new URL(path, metaURL).href)};`);
const { VILLAGE_SPRITES } = await import("data:text/javascript;base64," + Buffer.from(moduleText).toString("base64"));
const manifest = JSON.parse(readFileSync(new URL("assets/village/manifest.json", root), "utf8"));
const sha256 = file => createHash("sha256").update(readFileSync(file)).digest("hex");

// Inspect the decoded pictures, so stale bounds or duplicate artwork cannot pass
// merely by changing the accompanying metadata. Pillow is the baker's dependency.
const { stdout: pictureInspection } = await promisify(execFile)("python3", ["-c", String.raw`
import hashlib,json,sys
from pathlib import Path
from PIL import Image, ImageChops
root=Path(sys.argv[1]); manifest=json.loads((root/'assets/village/manifest.json').read_text()); result={}
for ident,character in manifest['characters'].items():
    runtime=character['runtime']; sheet=Image.open(root/runtime['file']).convert('RGBA'); frames=[]
    for index,frame in enumerate(character['frames']):
        cell=sheet.crop((index*256,0,(index+1)*256,320)); alpha=cell.getchannel('A'); visible=alpha.point(lambda a:255 if a>=108 else 0)
        bounds=alpha.getbbox(); body=visible.getbbox()
        lower=cell.crop((0,220,256,300))
        frames.append({'alphaBounds':list(bounds) if bounds else None,'bodyBounds':list(body) if body else None,'alphaHash':hashlib.sha256(alpha.tobytes()).hexdigest(),'lowerHash':hashlib.sha256(lower.tobytes()).hexdigest()})
    source=manifest['sources'][character['source']]; raw=Image.open(root/source['file']).convert('RGBA'); sources=[]
    for frame in character['frames']:
        cell=raw.crop(tuple(frame['sourceCropBox'])); bounds=cell.getchannel('A').point(lambda a:255 if a>=manifest['baker']['alphaCutoff'] else 0).getbbox()
        sources.append(list(bounds) if bounds else None)
    left=sheet.crop((256,220,512,300)).getchannel('A').point(lambda a:255 if a>=108 else 0); right=sheet.crop((768,220,1024,300)).getchannel('A').point(lambda a:255 if a>=108 else 0); changed=ImageChops.difference(left,right).histogram()[255]
    result[ident]={'size':list(sheet.size),'frames':frames,'sourceAlphaBounds':sources,'changedFootPixels':changed}
print(json.dumps(result))
`, fileURLToPath(root)], { encoding: "utf8", maxBuffer: 1024 * 1024 });
const inspection = JSON.parse(pictureInspection);

test("all nine painted neighbours have complete runtime sheets within the mobile art budget", () => {
  assert.deepEqual(Object.keys(VILLAGE_SPRITES).sort(), [...ids].sort());
  assert.deepEqual(Object.keys(manifest.characters).sort(), [...ids].sort());
  let bytes = 0;
  for (const id of ids) {
    const meta = VILLAGE_SPRITES[id], character = manifest.characters[id];
    assert.ok(validVillageSprite(meta), id + " has valid frame geometry");
    assert.equal(meta.height, 2.3, id + " uses the owners' world scale");
    assert.deepEqual([meta.w, meta.h], [1536, 320]);
    assert.deepEqual(inspection[id].size, [meta.w, meta.h]);
    assert.equal(meta.frames.length, 6);
    assert.equal(character.frames.length, 6);
    assert.equal(new URL(meta.url).pathname, new URL(character.runtime.file, root).pathname);
    bytes += statSync(new URL(character.runtime.file, root)).size;
  }
  assert.ok(bytes < 2 * 1024 * 1024, "the nine runtime sheets stay below 2 MiB");
});

test("the manifest identifies the actual source PNGs and packed WebP files", () => {
  for (const source of Object.values(manifest.sources)) {
    assert.match(source.file, /\.png$/);
    const file = new URL(source.file, root), bytes = readFileSync(file);
    assert.equal(sha256(file), source.sha256, source.file);
    assert.deepEqual([bytes.readUInt32BE(16), bytes.readUInt32BE(20)], [source.width, source.height], source.file + " PNG dimensions");
  }
  for (const id of ids) {
    const character = manifest.characters[id];
    assert.equal(sha256(new URL(character.runtime.file, root)), character.runtime.sha256, id);
    assert.ok(Number.isFinite(character.sharedScale) && character.sharedScale > 0, id + " records one character scale");
    character.frames.forEach((frame, index) => {
      const source = manifest.sources[character.source], row = character.sourceRow;
      const grid = [Math.round(index * source.width / 6), Math.round(row * source.height / 3), Math.round((index + 1) * source.width / 6), Math.round((row + 1) * source.height / 3)];
      assert.deepEqual(frame.sourceGridBox, grid, id + " takes the authored grid cell " + index);
      assert.deepEqual(frame.sourceCropBox, id === "vesper" ? [grid[0], grid[1] - 7, grid[2], grid[3]] : grid, id + " preserves the source crop " + index);
      assert.deepEqual(frame.sourceAlphaBounds, inspection[id].sourceAlphaBounds[index], id + " source bounds " + index);
      assert.deepEqual(frame.outputAlphaBounds, inspection[id].frames[index].alphaBounds, id + " packed bounds " + index);
      assert.deepEqual(frame.outputBodyBounds, inspection[id].frames[index].bodyBounds, id + " opaque body bounds " + index);
      const [x0, y0, x1, y1] = frame.sourceCropBox;
      assert.deepEqual(frame.resizeDimensions, [Math.round((x1 - x0) * character.sharedScale), Math.round((y1 - y0) * character.sharedScale)], id + " uses the same scale in every frame");
      const sourceBody = frame.sourceBodyBounds, outputBody = inspection[id].frames[index].bodyBounds;
      for (const axis of [0, 1]) {
        const resizeExtent = frame.resizeSourceBox[axis + 2] - frame.resizeSourceBox[axis];
        assert.ok(Math.abs(frame.resizeDimensions[axis] / resizeExtent - character.sharedScale) < 1e-12, id + " keeps exactly one scalar across both axes and all poses");
        const expected = (sourceBody[axis + 2] - sourceBody[axis]) * character.sharedScale;
        assert.ok(Math.abs(outputBody[axis + 2] - outputBody[axis] - expected) <= 3, id + " actual body keeps the shared scale in frame " + index);
      }
      assert.deepEqual(frame.contactFoot, [128, 300]);
    });
  }
});

test("every pose keeps its drawn body scale, common floor anchor and unclipped silhouette", () => {
  for (const id of ids) {
    const meta = VILLAGE_SPRITES[id], measured = inspection[id].frames, shapes = meta.frames.map(frame => villageFrameShape(meta, frame));
    assert.ok(meta.rows >= 220 && meta.rows <= 285, id + " has a measured body height");
    assert.equal(manifest.characters[id].rows, meta.rows);
    for (let index = 0; index < meta.frames.length; index++) {
      const frame = meta.frames[index], bounds = measured[index].alphaBounds, body = measured[index].bodyBounds;
      assert.deepEqual(frame, { x: index * 256, y: 0, w: 256, h: 320, ax: 128, ay: 300 }, id + " frame " + index);
      assert.deepEqual(shapes[index], shapes[0], id + " never changes size between poses");
      assert.ok(bounds && bounds[0] > 0 && bounds[1] > 0 && bounds[2] < 256 && bounds[3] < 320, id + " keeps hats, hands and props inside cell " + index);
      assert.ok(body[3] >= 296 && body[3] <= 301, id + " feet remain on the shared floor in frame " + index);
      assert.ok(Math.abs(shapes[index].unit * meta.rows - 2.3) < 1e-9);
    }
    const heights = measured.map(frame => frame.bodyBounds[3] - frame.bodyBounds[1]);
    assert.equal(meta.rows, Math.max(...heights), id + " scales the measured visible body to 2.3 world units");
    assert.ok(Math.max(...heights) - Math.min(...heights) <= 30, id + " does not pulse in size while walking");
  }
});

test("the four authored walk phases change the feet and alternate contact legs", () => {
  for (const id of ids) {
    const meta = VILLAGE_SPRITES[id], character = manifest.characters[id], measured = inspection[id].frames;
    assert.deepEqual(meta.actions, { idle: [0], walk: [1, 2, 3, 4], wave: [5], talk: [0] });
    assert.equal(new Set([1, 2, 3, 4].map(index => measured[index].alphaHash)).size, 4, id + " has four different walk silhouettes");
    assert.notEqual(measured[1].lowerHash, measured[3].lowerHash, id + " changes its contact pose");
    assert.ok(inspection[id].changedFootPixels > 150, id + " left and right contacts visibly differ at the feet");
    assert.equal(character.frames[1].contactSide, "left");
    assert.equal(character.frames[3].contactSide, "right");
    const poses = [0, 1 / 6, 2 / 6, 3 / 6].map(time => villageSpritePose(meta, { walking: true, time }));
    assert.deepEqual(poses.map(pose => pose.frame), [1, 2, 3, 4]);
    assert.deepEqual(poses.map(pose => pose.leadingLeg), ["left", "left", "right", "right"]);
    assert.equal(villageSpritePose(meta, { time: 90 }).frame, 0, id + " settles on its painted idle");
  }
});
