import test from "node:test";
import assert from "node:assert/strict";
import { buildModel } from "../src/decor-models/kit.js";
import { meshGrid } from "../src/voxel-mesh.js";
import { shelfRecipe, SHELF_PX } from "../src/decor-models/shelving.js";
import { SHELF_CATALOG, SHELF_FINISHES } from "../src/content/shelf-catalog.js";

// Pure-colour recipes need no art: plain pixels keep the test free of browser loaders.
function build(item, finish) {
  const recipe = shelfRecipe(item, finish), art = { w: recipe.width, h: recipe.height };
  return { recipe, ...buildModel(recipe, art, Array.from({ length: art.h }, () => new Int32Array(art.w).fill(-1))) };
}
const footprint = (item) => item.wall ? [item.wallWidth, 1] : item.footprint;

test("blank shelves are catalogue entries with surfaces inside their footprint and colour finishes", () => {
  assert.ok(SHELF_CATALOG.length >= 5);
  assert.equal(new Set(SHELF_CATALOG.map((s) => s.id)).size, SHELF_CATALOG.length);
  assert.ok(SHELF_FINISHES.length >= 5 && new Set(SHELF_FINISHES.map((f) => f.id)).size === SHELF_FINISHES.length);
  for (const f of SHELF_FINISHES) assert.ok(typeof f.name === "string" && Number.isInteger(f.color) && f.color >= 0 && f.color <= 0xffffff, f.id);
  for (const item of SHELF_CATALOG) {
    assert.equal(item.collection, "blank-shelves");
    assert.ok(item.price > 0 && item.name && item.description, item.id);
    assert.ok(item.finishes.length >= 5, `${item.id} comes in colours`);
    if (item.wall) assert.ok(item.wallWidth >= 1 && item.hangHeight > 0 && item.category === "decor", item.id);
    else assert.ok(item.footprint.length === 2 && item.category === "furniture", item.id);
    const [w, d] = footprint(item);
    assert.ok(item.surfaces.length >= 1, `${item.id} has somewhere to stand things`);
    for (const s of item.surfaces) {
      assert.ok(s.x >= 0 && s.z >= 0 && s.w > 0.5 && s.d > 0.5 && s.y > 0, `${item.id} surface is sensible`);
      assert.ok(s.x + s.w <= w + 1e-9 && s.z + s.d <= d + 1e-9, `${item.id} surface lies within its footprint`);
      for (const v of [s.x, s.z, s.w, s.d, s.y]) assert.ok(Math.abs(v * SHELF_PX - Math.round(v * SHELF_PX)) < 1e-9, `${item.id} surface sits on the voxel grid`);
    }
  }
});

test("every shelf's boards top out exactly at its surfaces, in every finish", () => {
  for (const item of SHELF_CATALOG) {
    const [w, d] = footprint(item), { grid, recipe } = build(item, item.finishes[0]);
    assert.ok(recipe.width <= w * SHELF_PX && recipe.depth <= d * SHELF_PX, `${item.id} fits its footprint`);
    for (const s of item.surfaces) {
      // Inside the surface, away from posts and gallery rails at its edges: wood
      // just under the top, open air just over it.
      const y = Math.round(s.y * SHELF_PX), m = 5, x0 = Math.round(s.x * SHELF_PX) + m, x1 = Math.round((s.x + s.w) * SHELF_PX) - m, z0 = Math.round(s.z * SHELF_PX) + m, z1 = Math.round((s.z + s.d) * SHELF_PX) - m;
      let under = 0, over = 0, n = 0;
      for (let x = x0; x < x1; x++) for (let z = z0; z < z1; z++) { n++; under += grid.filled(x, y - 1, z); over += grid.filled(x, y, z); }
      assert.ok(under / n > 0.97, `${item.id} board under y ${s.y} (${under}/${n})`);
      assert.ok(over / n < 0.02, `${item.id} clear above y ${s.y} (${over}/${n})`);
    }
    // Finishes change the colour, never the shape.
    const other = build(item, item.finishes[2]).grid;
    assert.deepEqual(other.kind, grid.kind, `${item.id} same shape in every finish`);
    assert.notDeepEqual(other.rgb, grid.rgb, `${item.id} finishes differ in colour`);
    assert.deepEqual(build(item, item.finishes[0]).grid.rgb, grid.rgb, `${item.id} deterministic`);
  }
});

test("shelves stay within a phone's mesh budget and have no NaN", () => {
  for (const item of SHELF_CATALOG) {
    const { grid } = build(item, item.finishes[1]), geometry = meshGrid(grid, { scale: 1 / SHELF_PX });
    const triangles = geometry.reduce((n, g) => n + (g ? g.index.count / 3 : 0), 0);
    assert.ok(triangles > 0 && triangles <= 30000, `${item.id}: ${triangles} triangles`);
    for (const g of geometry) if (g) for (const a of Object.values(g.attributes)) assert.ok(a.array.every(Number.isFinite), `${item.id} finite`);
  }
});
