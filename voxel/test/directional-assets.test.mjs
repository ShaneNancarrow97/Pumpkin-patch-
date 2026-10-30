// Verify reviewed runtime assets, not whether painted anatomy looks correct.
// Whole-strip / in-game review is still required; RGBA fingerprints come from
// the reviewed baker. Encoded SHA hashes below only check file integrity.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { costumeCatalog } from '../src/rules/wardrobe.js';
import { DIRECTION_DEGREES, compileDirectionalManifest } from '../src/content/directional-atlas.js';
import { buildDirectionalProductionReport } from '../tools/directional-coverage.mjs';

const root = new URL('../', import.meta.url);
const read = name => readFileSync(new URL(name, root));
const bank = JSON.parse(read('assets/directional/manifest.json'));
const catalogue = new Map(costumeCatalog.map(c => [c.id, c]));
function webpSize(data) {
  assert.equal(data.toString('ascii', 0, 4), 'RIFF');
  assert.equal(data.toString('ascii', 8, 12), 'WEBP');
  assert.equal(data.readUInt32LE(4) + 8, data.length, 'truncated or extended RIFF file');
  for (let p = 12; p + 8 <= data.length;) {
    const type = data.toString('ascii', p, p + 4), n = data.readUInt32LE(p + 4), start = p + 8;
    assert.ok(start + n <= data.length, 'truncated WebP chunk');
    if (type === 'VP8X') return { width: 1 + data.readUIntLE(start + 4, 3), height: 1 + data.readUIntLE(start + 7, 3) };
    if (type === 'VP8L') {
      assert.equal(data[start], 0x2f);
      const bits = data.readUInt32LE(start + 1);
      return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >>> 14) & 0x3fff) };
    }
    if (type === 'VP8 ') {
      assert.equal(data.toString('hex', start + 3, start + 6), '9d012a');
      return { width: data.readUInt16LE(start + 6) & 0x3fff, height: data.readUInt16LE(start + 8) & 0x3fff };
    }
    p += 8 + n + n % 2;
  }
  throw Error('WebP has no supported image header');
}

test('reviewed base art is accepted exactly as declared and preserves wardrobe identity', () => {
  assert.equal(bank.version, 1);
  for (const id of ['shane-base', 'natalie-base']) assert.ok(bank.looks[id], id + ' is not yet indexed');
  for (const [id, manifest] of Object.entries(bank.looks)) {
    assert.ok(catalogue.has(id), id + ' is not an existing costume');
    assert.equal(manifest.look, id);
    assert.equal(manifest.owner, catalogue.get(id).character);
    assert.equal(manifest.mobility, id === 'natalie-wheelchair' ? 'wheelchair' : 'walking');
    assert.ok(existsSync(new URL(manifest.sourceSeed, root)), id + ' approved seed is missing');
    const compiled = compileDirectionalManifest(manifest);
    assert.equal(compiled.validation.ok, true, JSON.stringify(compiled.validation.errors));
    assert.deepEqual(compiled.validation.warnings, [], id + ' contains rejected clips');
    const accepted = Object.values(compiled.actions).reduce((sum, a) => sum + Object.keys(a.directions).length, 0);
    assert.equal(accepted, manifest.clips.length, id + ' silently lost a clip');
    assert.ok(manifest.clips.length > 0);
    for (const c of manifest.clips) {
      assert.ok(existsSync(new URL(c.review.preview, root)), id + ' review evidence is missing');
      for (const f of c.frames) assert.match(f.fingerprint, /^[a-f0-9]{64}$/);
    }
  }
});

test('bundled pages match reviewed files and stay within per-page mobile limits', () => {
  for (const [id, manifest] of Object.entries(bank.looks)) {
    const used = new Set(manifest.clips.flatMap(c => c.frames.map(f => f.page)));
    for (const p of manifest.pages) {
      assert.ok(used.has(p.id), id + '/' + p.id + ' is decoded without any accepted clip');
      assert.match(p.url, /^assets\/directional\/.+\.webp$/);
      const bytes = read(p.url), size = webpSize(bytes);
      assert.deepEqual(size, { width: p.width, height: p.height }, p.url);
      assert.equal(bytes.length, p.encodedBytes, p.url + ' encoded size changed');
      assert.match(p.encodedSHA256, /^[a-f0-9]{64}$/);
      assert.equal(createHash('sha256').update(bytes).digest('hex'), p.encodedSHA256, p.url + ' differs from the reviewed image');
      assert.ok(size.width <= 4096 && size.height <= 4096, p.url + ' exceeds conservative mobile texture dimensions');
      assert.ok(size.width * size.height * 4 <= 12 * 1024 * 1024, p.url + ' exceeds 12 MiB base-level RGBA');
    }
  }
});

test('one body density and ground-anchor convention applies to every new frame', () => {
  for (const [id, manifest] of Object.entries(bank.looks)) {
    const pageMap = new Map(manifest.pages.map(p => [p.id, p]));
    if (id === manifest.owner + '-base') {
      const source = JSON.parse(read('assets/directional/' + manifest.owner + '/base.json'));
      assert.ok(Math.abs(manifest.pixelsPerUnit - source.rows / source.worldHeight) < 1e-6, id + ' lost its measured body density');
    }
    for (const c of manifest.clips) for (const f of c.frames) {
      const p = pageMap.get(f.page), r = f.rect;
      assert.ok(p, id + ' missing page');
      assert.equal(f.pixelsPerUnit, manifest.pixelsPerUnit);
      for (const value of [r.x, r.y, r.w, r.h]) assert.ok(Number.isInteger(value));
      assert.ok(r.x >= 0 && r.y >= 0 && r.x + r.w <= p.width && r.y + r.h <= p.height);
      assert.ok(f.anchor.x >= 0 && f.anchor.x <= r.w && f.anchor.y >= 0 && f.anchor.y <= r.h, id + ' ground anchor is outside the image');
      if (f.sockets?.hand) {
        assert.ok(Number.isFinite(f.sockets.hand.x) && Number.isFinite(f.sockets.hand.y));
        assert.ok(f.sockets.hand.x >= 0 && f.sockets.hand.x <= r.w && f.sockets.hand.y >= 0 && f.sockets.hand.y <= r.h);
      }
    }
  }
});

test('production report includes the whole wardrobe and never upgrades partial art to full coverage', () => {
  const report = buildDirectionalProductionReport(bank);
  assert.equal(report.summary.looks, costumeCatalog.length);
  assert.deepEqual(report.summary.unknownManifestLooks, []);
  assert.equal(new Set(report.looks.map(l => l.id)).size, costumeCatalog.length);
  assert.ok(report.looks.some(l => l.id === 'natalie-wheelchair' && l.mobility === 'wheelchair'));
  for (const look of report.looks) {
    const present = bank.looks[look.id];
    if (!present) {
      assert.equal(look.authoredFrames, 0);
      assert.equal(look.complete, false);
      assert.ok(Object.values(look.actions).every(a => a.absent.length === 24));
    }
    for (const [action, a] of Object.entries(look.actions)) {
      assert.equal(new Set([...a.full, ...a.pose, ...a.reduced, ...a.absent]).size, DIRECTION_DEGREES.length);
      for (const d of [...a.pose, ...a.reduced]) assert.ok(a.incomplete.includes(d), look.id + '/' + action + ' partial cycle counted complete');
      assert.equal(a.full.length + a.incomplete.length, 24);
    }
  }
});
