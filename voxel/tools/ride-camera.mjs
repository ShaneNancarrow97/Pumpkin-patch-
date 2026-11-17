// Where the hayride's camera points at every scare: runs a whole owner ride-along in Node, with the real ride world,
// view and scare cast, and reports how far off the middle of the view each scene, its sprite and the Hollow Man are
// as they play (handover 63). It bundles itself first, as the cast's art is imported as files.
//   node tools/ride-camera.mjs [routeLevel 0-2] [--rows]
// --rows prints every half unit of lane round each scene, and every half second of the breakdown.
import path from "node:path";
import os from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

if (typeof RIDE_CAMERA_BUNDLED === "undefined") {
  const { build } = await import("esbuild"), out = path.join(os.tmpdir(), `ride-camera-${process.pid}.mjs`);
  await build({ entryPoints: [fileURLToPath(import.meta.url)], bundle: true, platform: "node", format: "esm", outfile: out, logLevel: "error",
    define: { RIDE_CAMERA_BUNDLED: "true" }, external: ["esbuild"], loader: { ".webp": "dataurl", ".png": "dataurl", ".mp3": "dataurl", ".mid": "binary" } });
  await import(pathToFileURL(out).href);
} else {
  const THREE = await import("three");
  const { createHayrideWorld } = await import("../src/hayride-world.js"), { createHayrideView } = await import("../src/hayride-view.js");
  const { createHayrideScares } = await import("../src/hayride-scares.js"), { freshHayride } = await import("../src/rules/hayride.js");
  const { hayrideRouteProfile, hayrideRouteSample, hayrideJumpSpot } = await import("../src/content/hayride-layout.js");
  const level = Math.max(0, Math.min(2, +(process.argv[2] ?? 0) || 0)), rows = process.argv.includes("--rows");
  const state = { hayride: { ...freshHayride(), purchased: true, tier: 3, routeLevel: level, haunts: { owned: ["hollow-man"], active: ["hollow-man"] } }, visitors: [], upgrades: { plots: 0 }, coins: 0 };
  const world = createHayrideWorld({ scene: new THREE.Scene(), state, world: { group: new THREE.Group() }, signBoard: () => new THREE.Group(), createScares: createHayrideScares });
  const canvas = { clientWidth: 1280, clientHeight: 720, addEventListener() {}, removeEventListener() {}, setPointerCapture() {}, releasePointerCapture() {} };
  const profile = hayrideRouteProfile(level), cues = [], view = createHayrideView(canvas, state, { world, onCue: (cue) => cues.push({ ...cue, along: view.status.progress * profile.length }) });
  view.enter({ gentle: false });
  // Each set's focus, as getPreviewFrame works it out, and the spot its sprite waits at.
  const OFFSET = { spiders: 0, bride: 6.1, bus: 5.4 }, SPRITE = { scarecrows: 4.1, bride: 6.1, pursuit: 4.1, bus: 5.4, graveyard: 4.8, thicket: 4.5 };
  const scenes = profile.stops.map((stop) => {
    const f = hayrideRouteSample(stop.at * profile.length, level), off = stop.offset ?? OFFSET[stop.id] ?? 4.1, turn = f.yaw + (stop.id === "spiders" ? 0 : Math.PI / 2), out = stop.id === "spiders" ? 0 : 1;
    const set = new THREE.Vector3(f.x + f.dz * off + Math.sin(turn) * out, stop.id === "scarecrows" ? 2.3 : stop.id === "spiders" ? 3.1 : 1.6, f.z - f.dx * off + Math.cos(turn) * out);
    const spot = SPRITE[stop.id] ? hayrideJumpSpot({ ...stop, offset: SPRITE[stop.id] }, level) : null;
    return { id: stop.id, at: stop.at * profile.length, set, sprite: spot && new THREE.Vector3(spot.x, 1.8, spot.z), spriteAt: spot?.along };
  });
  const dir = new THREE.Vector3(), to = new THREE.Vector3();
  // Degrees off the middle of the view, across (negative to the left).
  const off = (p) => { view.camera.getWorldDirection(dir); to.copy(p).sub(view.camera.position); const a = Math.atan2(to.x, to.z) - Math.atan2(dir.x, dir.z); return -Math.atan2(Math.sin(a), Math.cos(a)) * 180 / Math.PI; };
  const log = [];
  for (let i = 0; i < 30 * 600 && !view.status.completed; i++) {
    view.tick(1 / 30); world.tick(i / 30);
    const s = view.status, along = s.progress * profile.length, frame = world.getPreviewFrame(s.progress), row = { t: s.elapsed, along, stall: s.stall, look: {} };
    for (const g of scenes) { if (Math.abs(g.at - along) < 16) row.look[g.id] = off(g.set); if (g.sprite && Math.abs(g.spriteAt - along) < 9) row.look[`${g.id} sprite`] = off(g.sprite); }
    if (frame?.hollow) row.look.hollow = off(frame.hollow.position);
    log.push(row);
  }
  const deg = (a) => a === undefined ? "    -" : `${a.toFixed(0)}°`.padStart(5), near = (key, d) => log.reduce((best, r) => Math.abs(r.along - d) < Math.abs((best?.along ?? Infinity) - d) ? r : best, null)?.look[key];
  // Lane units, past the set's middle (the tractor's place), over which a target stays within 12 degrees of the middle.
  const held = (key, at) => { const d = log.filter((r) => Math.abs(r.look[key] ?? 99) <= 12).map((r) => r.along - at); return d.length ? `${Math.min(...d).toFixed(1)} to ${Math.max(...d).toFixed(1)}` : "never"; };
  console.log(`Route ${level} (${profile.length.toFixed(0)} units). Angles are off the middle of the view; distances in units of lane past each set's middle.`);
  for (const g of scenes) {
    const scream = cues.find((c) => c.type === "encounter" && c.stop === g.id), jump = cues.find((c) => c.type === "jump" && c.stop === g.id);
    console.log(`\n${g.id}: scream at ${scream ? (scream.along - g.at).toFixed(1) : "-"} with the set ${deg(scream && near(g.id, scream.along))}; set within 12° from ${held(g.id, g.at)}` +
      (g.sprite ? `; sprite springs at ${jump ? (jump.along - g.at).toFixed(1) : "-"} at ${deg(jump && near(`${g.id} sprite`, jump.along))}, within 12° from ${held(`${g.id} sprite`, g.at)}` : ""));
    if (rows) for (const r of log.filter((r, i) => r.along > g.at - 13 && r.along < (g.spriteAt ?? g.at) + 5 && (i === 0 || Math.floor(r.along * 2) !== Math.floor(log[i - 1].along * 2))))
      console.log(`  ${(r.along - g.at).toFixed(1).padStart(6)}  set ${deg(r.look[g.id])}  sprite ${deg(r.look[`${g.id} sprite`])}${r.look.hollow !== undefined ? `  hollow ${deg(r.look.hollow)}` : ""}`);
  }
  const breakdown = log.filter((r) => Number.isFinite(r.stall) && r.stall >= 0 && r.stall < 40);
  if (breakdown.length) {
    const seen = breakdown.filter((r) => r.look.hollow !== undefined), inView = seen.filter((r) => Math.abs(r.look.hollow) <= 45);
    const last = seen.at(-1), next = scenes.find((g) => g.at > (breakdown[0]?.along ?? 0));
    console.log(`\nThe Hollow Man: in view (within 45°) ${(100 * inView.length / Math.max(1, seen.length)).toFixed(0)}% of the time he's out; last seen at ${last ? (last.along - (next?.at ?? 0)).toFixed(1) : "-"} units from the ${next?.id ?? "next scene"}`);
    if (rows) for (const r of breakdown.filter((r, i) => i === 0 || Math.floor(r.stall * 2) !== Math.floor(breakdown[i - 1].stall * 2)))
      console.log(`  stall ${r.stall.toFixed(1).padStart(5)}  hollow ${deg(r.look.hollow)}${next && r.look[next.id] !== undefined ? `  ${next.id} ${deg(r.look[next.id])}` : ""}`);
  }
}
