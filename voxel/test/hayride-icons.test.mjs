import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { HAYRIDE_TIERS, HAYRIDE_OPERATIONS, HAYRIDE_ROUTE_UPGRADES, HAYRIDE_SCARES } from '../src/content/hayride.js';
import { HAYRIDE_ICON_GRID, HAYRIDE_ICON_IDS, hayrideIconCell } from '../src/content/hayride-icon-map.js';

test('every actual tractor ride purchase has its own known art cell', () => {
  const purchases = [
    ...HAYRIDE_TIERS.map(t => 'tier' + t.level),
    ...HAYRIDE_OPERATIONS.map(u => u.id),
    ...HAYRIDE_ROUTE_UPGRADES.map(u => 'route' + u.level),
    ...HAYRIDE_SCARES.map(u => u.id),
  ];
  assert.deepEqual([...purchases].sort(), [...HAYRIDE_ICON_IDS].sort(), 'catalogue changed: provide or retire the corresponding upgrade art');
  assert.equal(new Set(HAYRIDE_ICON_IDS).size, HAYRIDE_ICON_IDS.length);
  for (const id of purchases) {
    const cell = hayrideIconCell(id);
    assert.ok(cell, id);
    assert.ok(cell.column >= 0 && cell.column < HAYRIDE_ICON_GRID.columns, id);
    assert.ok(cell.row >= 0 && cell.row < HAYRIDE_ICON_GRID.rows, id);
  }
  for (const unknown of ['not-an-upgrade', '', undefined, null, '__proto__']) assert.equal(hayrideIconCell(unknown), null);
});

function webpDimensions(bytes) {
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
  assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
  assert.equal(bytes.readUInt32LE(4) + 8, bytes.length, 'complete RIFF file');
  for (let p = 12; p + 8 <= bytes.length;) {
    const type = bytes.toString('ascii', p, p + 4), n = bytes.readUInt32LE(p + 4), start = p + 8;
    assert.ok(start + n <= bytes.length, 'complete WebP chunk');
    if (type === 'VP8X') return { width: 1 + bytes.readUIntLE(start + 4, 3), height: 1 + bytes.readUIntLE(start + 7, 3) };
    if (type === 'VP8L') {
      assert.equal(bytes[start], 0x2f);
      const bits = bytes.readUInt32LE(start + 1);
      return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >>> 14) & 0x3fff) };
    }
    if (type === 'VP8 ') {
      assert.equal(bytes.toString('hex', start + 3, start + 6), '9d012a');
      return { width: bytes.readUInt16LE(start + 6) & 0x3fff, height: bytes.readUInt16LE(start + 8) & 0x3fff };
    }
    p += 8 + n + n % 2;
  }
  throw Error('No supported image header');
}

test('the shipped menu atlas fits the declared cells and a mobile icon budget', () => {
  const bytes = readFileSync(new URL('../assets/hayride-upgrade-icons.webp', import.meta.url));
  const { columns, rows, cell } = HAYRIDE_ICON_GRID;
  assert.deepEqual(webpDimensions(bytes), { width: columns * cell, height: rows * cell });
  assert.ok(bytes.length < 350 * 1024, 'the icon sheet must not embed a full-size generation');
  assert.ok(columns * rows * cell * cell * 4 < 2 * 1024 * 1024, 'the menu sheet exceeds 2 MiB decoded');
});
