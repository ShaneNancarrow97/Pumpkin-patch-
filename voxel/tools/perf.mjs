// Where the farm's frame time and stalls go, on a busy late-game farm.
//   node tools/perf.mjs [file.html] [--seconds 40]     set CHROMIUM_PATH as for the smoke test
// Build first (`node build.mjs --readable --out <file>` keeps function names in
// the traces). It prints:
//   1. what the farm draws: lights, shadow-casting lights, draw calls, triangles;
//   2. frame times as the game draws them (glow pass on, shadows every other frame);
//   3. a busy farm played for a while, then a zoom into the meadow, a visit to
//      the shop floor and back: every shader compile and large picture upload
//      that happened mid-play, with where from, and the script time of each frame.
//      A compile makes the page wait for the software GPU to catch up, so a
//      frame with one can read seconds long; count the stalls, not those times.
// Software WebGL is far slower than a phone's GPU, so compare runs with each
// other rather than reading the times as real ones.
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const args = process.argv.slice(2), at = args.indexOf("--seconds"), seconds = at >= 0 ? Number(args[at + 1]) : 40;
const file = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--seconds") ?? "dist/pumpkin-patch-voxel.html";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const errors = [];

async function open(viewport) {
  const page = await (await browser.newContext({ viewport })).newPage(); page.setDefaultTimeout(600000);
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.addInitScript(() => {
    localStorage.setItem("pumpkin-patch-voxel-reference-v1-prefs", JSON.stringify({ music: false }));
    // Who uploads and compiles: a short stack for each, while recording.
    window.__uploads = new Map(); window.__frames = []; window.__mark = "";
    for (const proto of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype]) for (const name of ["texImage2D", "texSubImage2D", "createProgram"]) {
      const original = proto[name];
      proto[name] = function (...a) {
        if (!window.__recording) return original.apply(this, a);
        const t = performance.now(), result = original.apply(this, a), ms = performance.now() - t;
        const src = a.find((x) => x instanceof HTMLImageElement || x instanceof HTMLCanvasElement || x instanceof ImageBitmap);
        if (name === "createProgram" || src && src.width * src.height >= 256 * 256) {
          const where = new Error().stack.split("\n").slice(2, 8).map((l) => l.trim().replace(/^at /, "").replace(/\s*\(.*?:(\d+):\d+\)$/, ":$1")).join(" < ");
          const key = `${name}${src ? ` ${src.width}x${src.height}` : ""} [${window.__mark}] ${where}`, e = window.__uploads.get(key) ?? { n: 0, ms: 0 };
          e.n++; e.ms += ms; window.__uploads.set(key, e);
        }
        return result;
      };
    }
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => raf((t) => {
      const info = window.PumpkinVoxel?.scene?.debug?.renderer.info, programs = info?.programs?.length ?? 0;
      const a = performance.now(); cb(t); const ms = performance.now() - a;
      if (window.__recording && info) window.__frames.push({ ms, compiled: info.programs.length - programs, mark: window.__mark });
    });
  });
  await page.goto(file.includes("://") ? file : pathToFileURL(path.resolve(file)).href); await page.waitForSelector("body[data-ready]");
  await page.addStyleTag({ content: "#level-celebration,.npc-reward{display:none!important}" });
  await page.evaluate(() => {
    PumpkinVoxel.intro.skip();
    const s = PumpkinVoxel.state(), M = PumpkinVoxel.rules;
    Object.assign(s, { coins: 5e6, earned: 2e6 }); s.progression.claimed = Array.from({ length: 30 }, (_, i) => i + 1); s.progression.pending = [];
    M.buyMeadow(s); for (let i = 0; i < 3; i++) M.upgradeCocoa(s); for (const c of M.MEADOW_COMFORTS) M.buyComfort(s, c.id);
    Object.assign(s.hollowHouse, { purchased: true, status: "ready", open: true, tier: 5 }); s.hollowHouse.haunts.owned = M.MAZE_PREFABS.map((p) => p.id); s.hollowHouse.haunts.active = [...s.hollowHouse.haunts.owned];
    M.buyHayride(s); M.upgradeHayride(s); M.upgradeHayride(s); M.setHayrideOpen(s, true);
    Object.assign(s.visitorUpgrades, { party: 3, crowd: 7, lights: 4, appetite: 4 }); Object.assign(s.upgrades, { sign: 5, plots: 4, auto: 3, storage: 5 });
    s.stock = [500, 500, 500, 500]; s.shop.unlocked = true;
  });
  return page;
}

// 1 and 2: what the farm draws, and game-like frames at desktop size.
const page = await open({ width: 1280, height: 800 });
await page.evaluate(() => { PumpkinVoxel.state().paused = true; });
await page.waitForTimeout(5000);
const frames = await page.evaluate(() => {
  const { scene, renderer, composer } = PumpkinVoxel.scene.debug, gl = renderer.getContext(), px = new Uint8Array(4), times = [];
  const shown = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
  let points = 0, shadows = 0; const lazy = [];
  scene.traverse((o) => { if (!o.isLight || !shown(o)) return; if (o.isPointLight) points++; if (o.castShadow) { shadows++; if (o.shadow.autoUpdate === false) lazy.push(o); } });
  for (let i = 0; i < 8; i++) {
    if (i % 2 === 0) lazy.forEach((l) => (l.shadow.needsUpdate = true));
    const t = performance.now(); composer.render(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); times.push(performance.now() - t);
  }
  // Draw calls and triangles averaged over a frame that redraws the shadows and one that doesn't.
  renderer.info.autoReset = false; renderer.info.reset();
  for (let i = 0; i < 2; i++) { if (i === 0) lazy.forEach((l) => (l.shadow.needsUpdate = true)); composer.render(); }
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  const calls = Math.round(renderer.info.render.calls / 2), triangles = Math.round(renderer.info.render.triangles / 2); renderer.info.autoReset = true;
  return { pointLights: points, shadowedLights: shadows, callsPerFrame: calls, trianglesPerFrame: triangles, meanFrameMs: Math.round(times.reduce((a, b) => a + b) / times.length), slowestFrameMs: Math.round(Math.max(...times)) };
});
console.log("What the farm draws, and frames at 1280x800:", frames);
await page.context().close();

// 3: a busy farm in play. The farm runs a little faster than the slow
// software frames would let it, so guests come and go.
const play = await open({ width: 480, height: 300 });
await play.evaluate(() => {
  const s = PumpkinVoxel.state(), M = PumpkinVoxel.rules; s.paused = false;
  setInterval(() => { for (let i = 0; i < 12; i++) M.update(s, 1 / 60); if (s.festival.cocoa.stock < 20) s.festival.cocoa.stock = 100; if (s.stock[0] < 100) s.stock = [500, 500, 500, 500]; }, 40);
});
await play.waitForTimeout(8000);
await play.evaluate(() => { window.__recording = true; });
const step = async (mark, code, share) => { await play.evaluate(([mark, code]) => { window.__mark = mark; (0, eval)(code); }, [mark, code]); await play.waitForTimeout(seconds * 1000 * share); };
await step("farm", "0", .55);
await step("meadow zoomed", "PumpkinVoxel.scene.focus(48, 14, 3)", .15);
await step("shop floor", "PumpkinVoxel.enterShop()", .1);
await step("farm again", "PumpkinVoxel.leavePlace(); PumpkinVoxel.scene.focus(20, 12, 1)", .2);
const report = await play.evaluate(() => {
  window.__recording = false;
  const f = window.__frames, ms = f.map((x) => x.ms).sort((a, b) => a - b), q = (p) => +ms[Math.min(ms.length - 1, Math.floor(ms.length * p))].toFixed(1);
  return {
    frames: f.length, scriptMs: { median: q(.5), p90: q(.9), worst: q(1) },
    longest: [...f].sort((a, b) => b.ms - a.ms).slice(0, 8).map((x) => `${x.ms.toFixed(0)} ms in "${x.mark}"${x.compiled ? `, ${x.compiled} shaders compiled` : ""}`),
    stalls: [...window.__uploads].sort((a, b) => b[1].ms - a[1].ms).slice(0, 12).map(([k, v]) => `${v.n} x ${v.ms.toFixed(0)} ms  ${k}`),
  };
});
console.log("\nA busy farm in play (script time per frame):", JSON.stringify(report, null, 1));
if (errors.length) console.log("\nPage errors:", errors);
await browser.close();
process.exit(errors.length ? 1 : 0);
