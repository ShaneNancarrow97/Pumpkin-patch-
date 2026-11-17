import test from 'node:test';
import assert from 'node:assert/strict';
import * as World from '../src/village-world.js';

const targets = [
  { id: 'west-verge', x: 52, z: -6, grass: true },
  { id: 'east-verge', x: 64, z: -5.5, grass: true },
  { id: 'east-dry-fleck', x: 64, z: -6, grass: false, dry: true },
  { id: 'west-south-verge', x: 52, z: -13, grass: true },
  { id: 'arrival-centre', x: 58, z: -6, grass: false },
  { id: 'arrival-margin', x: 55, z: -6, grass: false },
  { id: 'forage-crossing', x: 52, z: -11, grass: false },
];

function colour(value) {
  if (/^#[\da-f]{6}$/i.test(value)) return [...[1, 3, 5].map(i => Number.parseInt(value.slice(i, i + 2), 16)), 255];
  const match = /^rgba\((\d+),(\d+),(\d+),([\d.]+)\)$/.exec(value);
  assert.ok(match, `the point sampler supports this painter colour: ${value}`);
  return [...match.slice(1, 4).map(Number), Math.round(Number(match[4]) * 255)];
}

// This is a point-sampled Canvas2D port, not a screenshot renderer. It applies
// the real painter's ordered opaque/RGBA fills at pixel centres, including
// elliptical shade patches. It deliberately does not model edge antialiasing.
function sampledGround() {
  const g = World.GROUND_SPREAD, samples = targets.map(target => {
    const px = Math.floor((target.x - g.x0) * g.scale), py = Math.floor((g.z1 - target.z) * g.scale);
    return { ...target, px, py, cx: px + .5, cy: py + .5, rgba: new Uint8ClampedArray(4), fills: [] };
  });
  const soilRectangles = [], canvas = { width: 0, height: 0 }, colours = new Map();
  let fillStyle = '#000000', ellipse = null;
  const paint = contains => {
    if (!colours.has(fillStyle)) colours.set(fillStyle, colour(fillStyle));
    const source = colours.get(fillStyle), alpha = source[3] / 255;
    for (const sample of samples) {
      if (!contains(sample.cx, sample.cy)) continue;
      const oldAlpha = sample.rgba[3] / 255, outAlpha = alpha + oldAlpha * (1 - alpha);
      for (let i = 0; i < 3; i++) sample.rgba[i] = outAlpha ? (source[i] * alpha + sample.rgba[i] * oldAlpha * (1 - alpha)) / outAlpha : 0;
      sample.rgba[3] = outAlpha * 255;
      sample.fills.push(fillStyle);
    }
  };
  const ctx = {
    set fillStyle(value) { fillStyle = value; }, get fillStyle() { return fillStyle; },
    fillRect(x, y, w, h) {
      const x0 = Math.min(x, x + w), x1 = Math.max(x, x + w), y0 = Math.min(y, y + h), y1 = Math.max(y, y + h);
      if (fillStyle === '#6d6150') soilRectangles.push({ x0: g.x0 + x0 / g.scale, x1: g.x0 + x1 / g.scale, z0: g.z1 - y1 / g.scale, z1: g.z1 - y0 / g.scale });
      paint((px, py) => px >= x0 && px < x1 && py >= y0 && py < y1);
    },
    beginPath() { ellipse = null; },
    ellipse(x, y, rx, ry, rotation, start, end) {
      assert.equal(rotation, 0); assert.equal(start, 0); assert.equal(end, Math.PI * 2);
      ellipse = { x, y, rx, ry };
    },
    fill() {
      assert.ok(ellipse, 'the current ground painter fills ellipses');
      const { x, y, rx, ry } = ellipse;
      paint((px, py) => ((px - x) / rx) ** 2 + ((py - y) / ry) ** 2 <= 1);
    },
    getImageData(x, y, w, h) {
      assert.equal(x, 0); assert.equal(y, 0); assert.equal(w, canvas.width); assert.equal(h, canvas.height);
      // Unobserved pixels stay zero. The real grass-mask loop therefore takes
      // its cheap non-green branch there, while every tested pixel remains real.
      const data = new Uint8ClampedArray(w * h * 4);
      for (const sample of samples) data.set(sample.rgba, (sample.py * w + sample.px) * 4);
      return { data };
    },
  };
  canvas.getContext = kind => { assert.equal(kind, '2d'); return ctx; };
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  let texture;
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement(tag) { assert.equal(tag, 'canvas'); return canvas; } } });
  try {
    assert.equal(typeof World.buildVillageGroundTexture, 'function');
    texture = World.buildVillageGroundTexture();
  } finally {
    if (previous) Object.defineProperty(globalThis, 'document', previous); else delete globalThis.document;
  }
  return { texture, samples, soilRectangles };
}

test('the actual ground painter keeps arrival underpaint native and restores grass beside the road', t => {
  const { texture, samples, soilRectangles } = sampledGround(); t.after(() => texture.dispose());
  const { data, width, height } = texture.image;
  assert.equal(width, (World.GROUND_SPREAD.x1 - World.GROUND_SPREAD.x0) * World.GROUND_SPREAD.scale);
  assert.equal(height, (World.GROUND_SPREAD.z1 - World.GROUND_SPREAD.z0) * World.GROUND_SPREAD.scale);
  const segments = [[-25.25, -7.75], [-14.25, 7.25], [.75, 27.25]];
  for (const [z0, z1] of segments) {
    const painted = soilRectangles.filter(q => Math.abs(q.z0 - z0) < 1e-8 && Math.abs(q.z1 - z1) < 1e-8 && Math.abs((q.x0 + q.x1) / 2 - 58) < 1e-8);
    assert.equal(painted.length, 1, `one actual arrival underpaint operation for ${z0}…${z1}`);
    assert.ok(Math.abs(painted[0].x0 - 54.75) < 1e-8 && Math.abs(painted[0].x1 - 61.25) < 1e-8, 'arrival underpaint stays within its native six-unit road plus .25-unit margins');
  }
  t.diagnostic(JSON.stringify(samples.map(sample => ({ id: sample.id, x: sample.x, z: sample.z, rgba: Array.from(data.slice(((height - 1 - sample.py) * width + sample.px) * 4, ((height - 1 - sample.py) * width + sample.px) * 4 + 4)) }))));
  for (const sample of samples) {
    // Canvas runs north-to-south. The real DataTexture output explicitly flips
    // those rows, so inspect the corresponding output texel rather than its mirror.
    const offset = ((height - 1 - sample.py) * width + sample.px) * 4, rgba = Array.from(data.slice(offset, offset + 4));
    assert.deepEqual(rgba.slice(0, 3), Array.from(sample.rgba.slice(0, 3)), sample.id + ' retains the actual ordered painter RGB');
    assert.equal(rgba[3], sample.grass ? 255 : 0, `${sample.id} has the intended grass-coverage alpha at native ${sample.x},${sample.z}`);
    assert.ok(sample.fills.length > 1, sample.id + ' is reached by the real layered painter');
    if (sample.grass) {
      assert.ok(rgba[1] > rgba[0] * 1.08 && rgba[1] > rgba[2] * 1.08, sample.id + ' is green lawn rather than brown road paint');
      assert.ok(!sample.fills.includes('#6d6150'), sample.id + ' is never covered by stretched road underpaint');
    } else if (sample.dry) {
      assert.ok(sample.fills.includes('#6c6547'), 'the existing dry lawn fleck keeps its non-grass coverage');
      assert.ok(!sample.fills.includes('#6d6150'), 'an existing dry fleck is distinct from stretched road underpaint');
    } else {
      assert.ok(sample.fills.includes('#6d6150'), sample.id + ' retains its authored road/trail soil');
    }
  }
});
