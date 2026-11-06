// Measures every catalogue model as the game builds it and writes the table the
// placement rules collide with, src/content/decor-sizes.js. The rules are pure
// (no three.js), so they can't measure a model themselves; run this again after
// changing a model.
//   node tools/measure-decor.mjs            [--out src/content/decor-sizes.js]  [--only f07,d05]  prints a summary
// For each piece: its real extent in room units in its own frame, and its
// largest clear flat top (where something could stand), found from a height map
// of its upward faces. Builds into its own temporary folder, so it can run while
// other builds do.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as esbuild from "esbuild";
import { chromium } from "playwright";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2), opt = (name, fallback) => { const i = args.indexOf("--" + name); return i >= 0 ? args[i + 1] : fallback; };
const out = path.resolve(root, opt("out", "src/content/decor-sizes.js")), only = opt("only", "");

// The page: builds each prop, walks its meshes (instanced ones too) and keeps the
// bounds and every horizontal face over a fine grid. Voxel models are all
// axis-aligned, so a cell's faces, up and down, say where something could stand
// there and how much room it has above.
const PAGE = `
import * as THREE from "three";
import { loadDecor, decorProp } from "./src/decor.js";
import { decorCatalog, footprint } from "./src/model.js";
const RES = 1 / 40, CLEAR = [0.3, 0.9, 9];
const v = new THREE.Vector3(), m = new THREE.Matrix4(), im = new THREE.Matrix4();
// Every triangle in room units. Shader-driven parts (the cauldron's steam) are
// moved on the graphics card, so their geometry says nothing about the piece.
function triangles(group, each) {
  group.updateMatrixWorld(true);
  group.traverse((o) => {
    if (!o.isMesh || !o.geometry?.attributes.position || o.geometry.attributes.aTag || o.material?.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile) return;
    const pos = o.geometry.attributes.position, idx = o.geometry.index, n = idx ? idx.count : pos.count;
    const count = o.isInstancedMesh ? o.count : 1;
    for (let k = 0; k < count; k++) {
      m.copy(o.matrixWorld); if (o.isInstancedMesh) { o.getMatrixAt(k, im); m.multiply(im); }
      const pts = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(m); pts[i * 3] = v.x; pts[i * 3 + 1] = v.y; pts[i * 3 + 2] = v.z; }
      for (let t = 0; t < n; t += 3) each(pts, idx ? idx.getX(t) : t, idx ? idx.getX(t + 1) : t + 1, idx ? idx.getX(t + 2) : t + 2);
    }
  });
}
// The biggest rectangle of true cells in a mask (rows of columns), by histograms.
function biggest(mask, rows, cols) {
  const hist = new Int32Array(cols); let best = null;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) hist[c] = mask[r * cols + c] ? hist[c] + 1 : 0;
    const stack = [];
    for (let c = 0; c <= cols; c++) {
      const h = c < cols ? hist[c] : 0;
      while (stack.length && hist[stack[stack.length - 1]] >= h) {
        const top = stack.pop(), height = hist[top], left = stack.length ? stack[stack.length - 1] + 1 : 0, area = height * (c - left);
        if (height && (!best || area > best.area)) best = { area, c0: left, c1: c - 1, r0: r - height + 1, r1: r };
      }
      stack.push(c);
    }
  }
  return best;
}
function measure(id) {
  const prop = decorProp(id), box = new THREE.Box3();
  triangles(prop, (p, a, b, c) => { for (const i of [a, b, c]) box.expandByPoint(v.set(p[i * 3], p[i * 3 + 1], p[i * 3 + 2])); });
  const x0 = box.min.x, z0 = box.min.z, cols = Math.max(1, Math.ceil((box.max.x - x0) / RES)), rows = Math.max(1, Math.ceil((box.max.z - z0) / RES));
  const ups = Array.from({ length: cols * rows }, () => []), downs = Array.from({ length: cols * rows }, () => []);
  triangles(prop, (p, a, b, c) => {
    const y = p[a * 3 + 1];
    if (Math.abs(p[b * 3 + 1] - y) > 1e-4 || Math.abs(p[c * 3 + 1] - y) > 1e-4) return;
    const ax = p[a * 3], az = p[a * 3 + 2], bx = p[b * 3], bz = p[b * 3 + 2], cx = p[c * 3], cz = p[c * 3 + 2];
    const turn = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);           // the face normal's y: up faces wind anticlockwise from above
    if (Math.abs(turn) < 1e-9) return;
    const list = turn > 0 ? ups : downs;
    const i0 = Math.max(0, Math.floor((Math.min(ax, bx, cx) - x0) / RES)), i1 = Math.min(cols - 1, Math.ceil((Math.max(ax, bx, cx) - x0) / RES));
    const j0 = Math.max(0, Math.floor((Math.min(az, bz, cz) - z0) / RES)), j1 = Math.min(rows - 1, Math.ceil((Math.max(az, bz, cz) - z0) / RES));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const px = x0 + (i + 0.5) * RES, pz = z0 + (j + 0.5) * RES;
      const w0 = (bx - ax) * (pz - az) - (bz - az) * (px - ax), w1 = (cx - bx) * (pz - bz) - (cz - bz) * (px - bx), w2 = (ax - cx) * (pz - cz) - (az - cz) * (px - cx);
      if ((w0 >= 0 && w1 >= 0 && w2 >= 0) || (w0 <= 0 && w1 <= 0 && w2 <= 0)) list[j * cols + i].push(y);
    }
  });
  // How much room there is above an up face at y: up to the next face down over it.
  const room = (k, y) => downs[k].reduce((r, d) => (d > y + 0.004 ? Math.min(r, d - y) : r), 9);
  const levels = new Set();
  for (const list of ups) for (const y of list) if (y >= 0.2) levels.add(Math.round(y * 200) / 200);
  // The biggest clear rectangles at each height, for a few amounts of headroom.
  const found = [];
  for (const level of levels) for (const need of CLEAR) {
    const mask = new Uint8Array(cols * rows);
    let n = 0;
    for (let k = 0; k < mask.length; k++) if (ups[k].some((y) => Math.abs(y - level) < 0.008) && room(k, level) >= need) { mask[k] = 1; n++; }
    for (let pass = 0; pass < 2 && n * RES * RES >= 0.06; pass++) {
      const r = biggest(mask, rows, cols);
      if (!r || (r.c1 - r.c0 + 1) * RES < 0.2 || (r.r1 - r.r0 + 1) * RES < 0.2 || r.area * RES * RES < 0.06) break;
      let clear = 9;
      for (let j = r.r0; j <= r.r1; j++) for (let i = r.c0; i <= r.c1; i++) { clear = Math.min(clear, room(j * cols + i, level)); mask[j * cols + i] = 0; }
      found.push({ ...r, level, clear });
    }
  }
  const round = (n) => Math.round(n * 1000) / 1000, fp = footprint(id);
  const tops = found.map((r) => [round(r.level), round(x0 + r.c0 * RES + RES / 2), round(x0 + (r.c1 + 1) * RES - RES / 2), round(z0 + r.r0 * RES + RES / 2), round(z0 + (r.r1 + 1) * RES - RES / 2), round(r.clear)])
    .filter((t, i, all) => all.findIndex((u) => u.slice(0, 5).join() === t.slice(0, 5).join()) === i)
    .sort((a, b) => (b[2] - b[1]) * (b[4] - b[3]) - (a[2] - a[1]) * (a[4] - a[3])).slice(0, 5);
  return {
    box: [Math.floor(box.min.x * 1000) / 1000, Math.ceil(box.max.x * 1000) / 1000, Math.floor(box.min.z * 1000) / 1000, Math.ceil(box.max.z * 1000) / 1000, round(box.max.y)],
    tops, nominal: [fp.w, fp.d, fp.layer],
  };
}
(async () => {
  try {
    await loadDecor();
    const want = new URLSearchParams(location.search).get("only"), sizes = {}, failed = {};
    for (const item of decorCatalog) {
      if (["books", "wallpaper"].includes(item.category) || (want && !want.split(",").includes(item.id))) continue;
      try { sizes[item.id] = measure(item.id); } catch (e) { failed[item.id] = String(e?.message ?? e); }
    }
    window.result = { sizes, failed };
  } catch (e) { window.result = { error: String(e?.stack ?? e) }; }
})();
`;

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "measure-decor-"));
try {
  await esbuild.build({ stdin: { contents: PAGE, resolveDir: root, loader: "js" }, bundle: true, outfile: path.join(tmp, "page.js"), format: "iife", target: ["es2020"], loader: { ".png": "dataurl", ".webp": "dataurl" }, logLevel: "warning" });
  fs.writeFileSync(path.join(tmp, "page.html"), `<!doctype html><meta charset="utf-8"><body><script src="page.js"></script>`);
  const local = "/opt/pw-browsers/chromium", browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : fs.existsSync(local) ? { executablePath: local } : {}) });
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.error("page error:", e.message));
  await page.goto(`file://${path.join(tmp, "page.html")}${only ? "?only=" + only : ""}`);
  await page.waitForFunction(() => window.result, null, { timeout: 600000 });
  const { sizes, failed, error } = await page.evaluate(() => window.result);
  await browser.close();
  if (error) throw new Error(error);
  for (const [id, why] of Object.entries(failed)) console.warn(`not measured: ${id} (${why})`);
  // Keep what's already measured for pieces this run skipped (--only, or a model mid-change).
  let kept = {};
  if (fs.existsSync(out)) { try { kept = (await import(pathToFileURL(out).href + "?t=" + Date.now())).DECOR_SIZES ?? {}; } catch {} }
  const all = { ...kept }, fmt = (a) => a && `[${a.join(", ")}]`;
  for (const [id, m] of Object.entries(sizes)) {
    all[id] = { box: m.box, ...(m.tops.length ? { tops: m.tops } : {}) };
    const [w, d, layer] = m.nominal, [x0, x1, z0, z1, h] = m.box;
    console.log(`${id.padEnd(24)} ${layer.padEnd(5)} ${w}x${d}  real ${(x1 - x0).toFixed(2)} x ${(z1 - z0).toFixed(2)} x ${h.toFixed(2)}${m.tops.map((t) => `\n${"".padEnd(36)}top y ${t[0]}  ${(t[2] - t[1]).toFixed(2)} x ${(t[4] - t[3]).toFixed(2)} at ${t[1]},${t[3]}  room ${t[5]}`).join("")}`);
  }
  const lines = Object.keys(all).sort().map((id) => `  ${JSON.stringify(id)}: { box: ${fmt(all[id].box)}${all[id].tops ? `, tops: [${all[id].tops.map(fmt).join(", ")}]` : ""} },`);
  fs.writeFileSync(out, `// Generated by tools/measure-decor.mjs from the built models: don't edit by hand, run it again.
// Each piece's real size in room units, in its own frame: floor pieces centred on
// their footprint with the front towards +z, wall pieces centred along the wall
// with z out from it and y up from their bottom edge.
//   box: [minX, maxX, minZ, maxZ, height]
//   tops: [[y, minX, maxX, minZ, maxZ, room], ...], its biggest clear flat places,
//     largest first, with how much room there is above each (9: open to the ceiling)
export const DECOR_SIZES = {
${lines.join("\n")}
};
`);
  console.log(`wrote ${path.relative(process.cwd(), out)} (${Object.keys(all).length} pieces)`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
