// Exercises the real controls and CSS in Chromium without the slow WebGL
// world. Integrated village gameplay is checked by village-game-qa.mjs.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = process.argv[2] ?? "/tmp/village-controls-qa";
await fs.mkdir(out, { recursive: true });
const css = (await Promise.all(["village-ui.css", "village-game.css", "village-controls.css"].map(file => fs.readFile(path.join(root, "src/ui", file), "utf8")))).join("\n");
const bundle = await build({ entryPoints: [path.join(root, "src/ui/village-controls.js")], bundle: true, format: "iife", globalName: "VillageControls", write: false, logLevel: "silent" });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
const errors = [], reports = [];
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
page.on("pageerror", error => errors.push(error.message));
await page.setContent(`<style>:root{--body:Arial,sans-serif;--display:Georgia,serif;--village-body:Arial,sans-serif;--village-display:Georgia,serif;--tv-zoom:1}body{margin:0;background:linear-gradient(145deg,#3b3150,#171d34);height:100dvh}${css}</style><section id="village-game"><header class="vg-heading"><button id="vg-home">‹ <span>Farm</span></button><div><small>Mothlight Village</small><b>Hollow Green</b></div><span id="vg-coins">£520</span><button id="vg-person">Shane</button><button aria-label="Fullscreen">⛶</button></header><button class="vg-objective">A place for every neighbour</button><nav class="vg-dock"><button>Map</button><button aria-label="Neighbours">People</button><button>Journal</button><button>Satchel</button><button>Decorate</button></nav><aside id="vg-panel" hidden><header><h2>Village journal</h2><button id="vg-panel-close" aria-label="Close village panel">×</button></header><div id="vg-panel-body"><details><summary data-pad-default>Give a present</summary><button id="gift">Pumpkin</button></details><label>Camera speed <input id="range" aria-label="Camera speed" type="range" min="0" max="4" step="1" value="2"></label><label>Picture <select id="select"><option>Low</option><option disabled>Unused</option><option>High</option></select></label>${Array.from({ length: 14 }, (_, i) => `<article><h3>Village memory ${i + 1}</h3><p>A quiet evening beneath the Moth Tree.</p><button id="memory-${i}">Read memory</button></article>`).join("")}</div></aside><div id="vg-stick-zone"><div id="vg-stick" hidden><i></i></div></div><button id="vg-interact" class="vg-interact">Talk</button><button id="vg-look" class="vg-look" aria-label="Centre the camera">◎</button></section>`);
await page.addScriptTag({ content: bundle.outputFiles[0].text });
await page.evaluate(() => {
  window.__pads = []; window.__time = 1000;
  const root = document.getElementById("village-game");
  window.__controls = VillageControls.createVillageControls({ root, blocked: () => root.classList.contains("has-panel"), gamepads: () => window.__pads, now: () => window.__time });
  window.__step = () => { const input = __controls.poll(); const panel = document.getElementById("vg-panel"); if (!panel.hidden) __controls.handleMenu(panel, input.pad); return input; };
  window.__snapshot = () => { const input = __controls.poll(); return { move: input.move, look: input.look, sprint: input.sprint, source: input.source }; };
  window.__pointer = (id, type, pointerId, x = 0, y = 0) => document.getElementById(id).dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId, pointerType: "touch", clientX: x, clientY: y }));
});

const multi = await page.evaluate(() => {
  const centre = id => { const r = document.getElementById(id).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; };
  const left = centre("vg-stick"), right = centre("vg-look-stick");
  __pointer("vg-stick-zone", "pointerdown", 11, left.x, left.y); __pointer("vg-stick-zone", "pointermove", 11, left.x + 30, left.y - 20);
  __pointer("vg-look-zone", "pointerdown", 22, right.x, right.y); __pointer("vg-look-zone", "pointermove", 22, right.x - 25, right.y + 15);
  const both = __snapshot(); __pointer("vg-stick-zone", "pointercancel", 99); const wrong = __snapshot();
  __pointer("vg-look-zone", "pointerup", 22); const one = __snapshot();
  __pointer("vg-stick-zone", "pointermove", 11, left.x + 10000, left.y - 10000); const bound = __snapshot();
  __pointer("vg-stick-zone", "pointercancel", 11); return { both, wrong, one, bound, released: __snapshot() };
});
assert.ok(multi.both.move.x > 0 && multi.both.look.x < 0, "two simultaneous thumbs steer independent sticks");
assert.deepEqual(multi.wrong.move, multi.both.move, "an unrelated pointer cannot release movement");
assert.ok(multi.one.move.x > 0); assert.equal(multi.one.look.x, 0); assert.ok(Math.hypot(multi.bound.move.x, multi.bound.move.y) <= 1.000001);
assert.deepEqual(multi.released.move, { x: 0, y: 0 });

const pad = await page.evaluate(() => {
  __pads = [{ id: "DualSense Wireless Controller", index: 0, mapping: "standard", connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 18 }, () => ({ pressed: false, value: 0 })) }];
  const idle = __snapshot(); __pads[0].buttons[0].pressed = true; const used = __snapshot();
  const hidden = getComputedStyle(document.getElementById("vg-stick-zone")).display === "none";
  __pads[0].buttons[0].pressed = false; __step();
  document.getElementById("vg-panel").hidden = false; document.getElementById("village-game").classList.add("has-panel"); __controls.release(); __step();
  __pads[0].buttons[0].pressed = true; __step(); const summaryOpened = document.querySelector("details").open;
  __pads[0].buttons[0].pressed = false; __step();
  document.getElementById("range").focus(); __pads[0].buttons[15].pressed = true; __step(); const rangeFirst = document.getElementById("range").value;
  __time += 359; __step(); const rangeWait = document.getElementById("range").value; __time++; __step(); const rangeRepeat = document.getElementById("range").value;
  __pads[0].buttons[15].pressed = false; __step(); document.getElementById("select").focus(); __pads[0].buttons[15].pressed = true; __step(); const selected = document.getElementById("select").selectedIndex;
  __pads[0].buttons[15].pressed = false; __step();
  __pads[0].axes[3] = 1; __time += 100; __step(); const scrolled = document.getElementById("vg-panel-body").scrollTop;
  __pads = []; const disconnected = __snapshot();
  document.getElementById("vg-panel").hidden = true; document.getElementById("village-game").classList.remove("has-panel"); __step();
  return { idle, used, hidden, summaryOpened, rangeFirst, rangeWait, rangeRepeat, selected, scrolled, disconnected };
});
assert.equal(pad.idle.source, "touch", "a connected idle PS5 pad does not hide touch"); assert.equal(pad.used.source, "pad"); assert.equal(pad.hidden, true);
assert.equal(pad.summaryOpened, true, "Cross opens a gift disclosure"); assert.equal(pad.rangeFirst, "3"); assert.equal(pad.rangeWait, "3"); assert.equal(pad.rangeRepeat, "4");
assert.equal(pad.selected, 2, "D-pad skips unavailable select options"); assert.ok(pad.scrolled > 0, "right stick scrolls the panel"); assert.equal(pad.disconnected.source, "touch");

for (const [name, width, height, zoom] of [["cover", 390, 844, 1], ["narrow", 360, 800, 1], ["fold", 768, 884, 1], ["landscape", 844, 390, 1], ["tv", 1920, 1080, 1.54], ["mirror", 844, 390, .557]]) {
  await page.setViewportSize({ width, height });
  await page.evaluate(({ zoom, name }) => { document.body.classList.toggle("tv-mode", name === "tv" || name === "mirror"); document.documentElement.style.setProperty("--tv-zoom", zoom); __step(); }, { zoom, name });
  const bounds = await page.evaluate(() => {
    const elements = [document.getElementById("vg-stick"),document.getElementById("vg-look-stick"),...document.querySelectorAll("#village-game button")].filter(el => el.getClientRects().length && !el.closest("[hidden]"));
    return elements.map(el => { const r = el.getBoundingClientRect(); return { id: el.id || el.textContent, x: r.x, y: r.y, width: r.width, height: r.height }; });
  });
  for (const b of bounds) { assert.ok(b.x >= -1 && b.y >= -1 && b.x + b.width <= width + 1 && b.y + b.height <= height + 1, `${name} ${b.id} within viewport`); assert.ok(b.width >= 44 && b.height >= 44, `${name} ${b.id} keeps a 44px target`); }
  await page.screenshot({ path: path.join(out, `${name}.png`) });
  await page.evaluate(() => { document.getElementById("vg-panel").hidden = false; document.getElementById("village-game").classList.add("has-panel"); __step(); });
  const panel = await page.locator("#vg-panel").boundingBox();
  assert.ok(panel.x >= 0 && panel.y >= 0 && panel.x + panel.width <= width + 1 && panel.y + panel.height <= height + 1, `${name} panel stays within viewport`);
  await page.screenshot({ path: path.join(out, `${name}-panel.png`) });
  const padSurface = await page.evaluate(() => {
    __pads = [{ id: "DualSense Wireless Controller", index: 0, mapping: "standard", connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 18 }, () => ({ pressed: false, value: 0 })) }];
    __step(); __pads[0].buttons[9].pressed = true; __step(); __pads[0].buttons[9].pressed = false; __step();
    const surface = document.getElementById("vg-panel"), r = surface.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height, rootZoom: getComputedStyle(document.getElementById("village-game")).zoom, zoom: getComputedStyle(surface).zoom, childZoom: getComputedStyle(surface.querySelector("header")).zoom, focus: !!surface.querySelector("[data-pad-focus]") };
  });
  assert.ok(padSurface.x >= 0 && padSurface.y >= 0 && padSurface.x + padSurface.width <= width + 1 && padSurface.y + padSurface.height <= height + 1, `${name} controller panel stays within viewport`);
  assert.equal(Number(padSurface.rootZoom), 1); assert.equal(Number(padSurface.childZoom), 1); assert.equal(Number(padSurface.zoom), zoom); assert.equal(padSurface.focus, true);
  await page.screenshot({ path: path.join(out, `${name}-controller.png`) });
  await page.evaluate(() => { __pads = []; document.getElementById("vg-panel").hidden = true; document.getElementById("village-game").classList.remove("has-panel"); __step(); });
  reports.push({ name, width, height, zoom, bounds, panel, padSurface });
}
const lifecycle = await page.evaluate(() => {
  const box = document.getElementById("vg-stick").getBoundingClientRect(), x = box.x + box.width / 2, y = box.y + box.height / 2;
  __pointer("vg-stick-zone", "pointerdown", 33, x, y); __pointer("vg-stick-zone", "pointermove", 33, x + 30, y);
  const moving = __snapshot(); window.dispatchEvent(new Event("blur")); const blurred = __snapshot(); window.dispatchEvent(new Event("focus")); const resumed = __snapshot();
  __controls.dispose(); return { moving, blurred, resumed, remaining: !!document.getElementById("vg-look-zone") };
});
assert.ok(lifecycle.moving.move.x > 0); assert.equal(lifecycle.blurred.move.x, 0); assert.equal(lifecycle.resumed.move.x, 0); assert.equal(lifecycle.remaining, false);
assert.deepEqual(errors, []);
await fs.writeFile(path.join(out, "report.json"), JSON.stringify({ passed: true, multi, pad, lifecycle, profiles: reports, errors }, null, 2));
await browser.close();
console.log(JSON.stringify({ passed: true, profiles: reports.map(report => report.name), errors, output: out }));
