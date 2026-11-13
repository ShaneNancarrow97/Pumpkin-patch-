// Actual offline-game rendering QA. Root runs this tool; authoring it does not
// validate the GPU path. Native game RAF/rendering stays in charge throughout.
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { chromium } from "playwright";
import * as M from "../src/model.js";
import { VILLAGE_ATMOSPHERE_CYCLE_SECONDS } from "../src/content/village-grade.js";
import { OUTSIDE_VIEW } from "../src/village-camera.js";

const args = process.argv.slice(2);
if (!args[0] || !args[1]) throw new Error("Usage: node tools/village-webgpu-qa.mjs HTML OUT [--webgl] [--portrait]");
const file = path.resolve(args[0]), out = path.resolve(args[1]), webgl = args.includes("--webgl"), portrait = args.includes("--portrait");
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const html = await fs.readFile(file), state = M.freshState(), duskClock = VILLAGE_ATMOSPHERE_CYCLE_SECONDS * 2 / 3;
Object.assign(state, { introSeen: true, coins: 30000, earned: M.LEVELS[19].at, visitorTimer: 1e9 }); state.shop.arrivalTimer = 1e9;
state.progression.claimed = M.LEVELS.map(l => l.level); state.progression.pending = []; state.progression.homeLegacyThrough = 20;
M.inviteToVillage(state); M.finishTour(state); state.village.clock = duskClock;
state.village.quests.invitation = { step: 3, done: true }; state.village.quests["two-doorbells"] = { step: 3, done: true };
state.village.built["elowen-library"] = state.village.built["rowan-workshop"] = true;
state.village.expansion.effects = [...new Set(M.EXPANSION_CHAPTERS.flatMap(c => [c.id, ...(c.reward?.effects ?? [])]))];
for (const who of ["elowen", "rowan", "mabel", "tansy", "opal", "cinder", "corvus", "baron", "granny"]) state.village.friends[who] = { met: true, xp: 1080, chatIn: 0, gifts: [], seen: [] };
M.startQuest(state, "rowan-1"); M.actVillageExpansion(state, "track", { chapter: "green-research" });
const fixture = M.saveData(state), preferences = { music: false, sound: false, voiceEnabled: false, frameRate: "30", renderQuality: "sharp", voxelCharacters: false, glow: true, shadows: true, villageTrackedQuest: "green-research" };
const launchArgs = ["--no-sandbox", "--disable-dev-shm-usage", "--enable-unsafe-webgpu", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-features=Vulkan", "--use-vulkan=swiftshader", "--disable-vulkan-surface"];
const report = {
  file, htmlSha256: hash(html), bytes: html.length, harnessSha256: hash(await fs.readFile(new URL(import.meta.url))), fixtureSha256: hash(JSON.stringify(fixture)), stateVersion: state.version,
  expectedBackend: webgl ? "webgl" : "webgpu", executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium", launchArgs, viewport: { width: 960, height: 540 }, preferences,
  staging: { owner: "natalie", duskClock, wallClock: "2026-11-13T21:00:00Z", randomSeed: 20261113, referencePose: { x: 87, z: -16.5, yaw: 0, pitch: OUTSIDE_VIEW.pitch, distance: OUTSIDE_VIEW.distance } },
  scope: "Exact offline HTML served unchanged over loopback; declared progressed fixture, real native RAF/rendering and HTML UI. No held draws, manual game renders or device-FPS claim. Legacy atlas uses the shipped user-facing synchronous capture, then restores source state. Dawn SwiftShader is software WebGPU; this does not certify physical phone/TV/Bluetooth performance.",
  checks: [], screenshots: [], errors: [], consoleErrors: [], warnings: [], externalRequests: [], failedRequests: [], logCounts: {},
};
const boundedLog = (kind, value, limit = 48) => { report.logCounts[kind] = (report.logCounts[kind] ?? 0) + 1; if (report[kind].length < limit) report[kind].push(String(value).slice(0, 12000)); };
const check = (label, pass, actual, fatal = true) => { report.checks.push({ label, pass: !!pass, fatal, ...(actual === undefined ? {} : { actual }) }); console.log(`${pass ? "ok" : "FAIL"} ${label}`); if (!pass) console.log(JSON.stringify(actual)); if (!pass && fatal) throw new Error(label); };
await fs.mkdir(out, { recursive: true });
await fs.writeFile(path.join(out, "fixture.json"), JSON.stringify({ save: fixture, preferences, staging: report.staging }, null, 2));
const server = createServer((req, res) => { if (req.url === "/favicon.ico") return res.writeHead(204).end(); res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); res.end(html); });
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser, page;
try {
  browser = await chromium.launch({ executablePath: report.executablePath, args: launchArgs, timeout: 30000 }); report.browserVersion = browser.version();
  page = await browser.newPage({ viewport: report.viewport, deviceScaleFactor: 1 }); page.setDefaultTimeout(180000);
  page.on("pageerror", error => boundedLog("errors", error.stack ?? error.message));
  page.on("console", message => { if (message.type() === "error") boundedLog("consoleErrors", message.text()); else if (message.type() === "warning") boundedLog("warnings", message.text(), 32); });
  page.on("request", request => { if (/^https?:/.test(request.url()) && !request.url().startsWith(origin + "/")) boundedLog("externalRequests", request.url()); });
  page.on("requestfailed", request => boundedLog("failedRequests", `${request.url().slice(0, 300)}: ${request.failure()?.errorText}`));
  await page.addInitScript(({ save, preferences }) => {
    localStorage.setItem("pumpkin-patch-voxel-reference-v1", JSON.stringify(save)); localStorage.setItem("pumpkin-patch-voxel-reference-v1-prefs", JSON.stringify(preferences));
    const NativeDate = Date, wall = new NativeDate("2026-11-13T21:00:00Z").getTime();
    window.Date = class extends NativeDate { constructor(...values) { super(...(values.length ? values : [wall])); } static now() { return wall; } };
    let seed = 20261113; Math.random = () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; };
  }, { save: fixture, preferences });
  await page.goto(`${origin}/${webgl ? "?villageRenderer=webgl" : ""}`, { waitUntil: "domcontentloaded", timeout: 180000 });
  await page.waitForSelector("body[data-ready]");
  report.capability = await page.evaluate(() => ({ secureContext: isSecureContext, gpuApi: !!navigator.gpu, userAgent: navigator.userAgent }));
  if (!webgl) check("The browser exposes WebGPU on the tested secure origin", report.capability.gpuApi, report.capability);
  const readStatus = () => page.evaluate(() => PumpkinVoxel.scene.villageRendererStatus);
  const frames = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const open = async () => {
    await page.keyboard.press("Shift");
    await page.evaluate(({ pose, duskClock }) => {
      const p = PumpkinVoxel; p.scene.player.setEnabled(true, "natalie"); p.state().village.clock = duskClock; p.openVillage();
      p.village.place(pose.x, pose.z, { x: 0, z: -1 });
      p.scene.villageView.play.reset(p.scene.villageView.play.state.subject, { yaw: pose.yaw, pitch: pose.pitch, distance: pose.distance });
    }, { pose: report.staging.referencePose, duskClock });
    await page.waitForFunction(() => ["ready", "fallback", "disabled"].includes(PumpkinVoxel.scene.villageRendererStatus?.stage), null, { timeout: 180000 });
    const status = await readStatus();
    check(webgl ? "Explicit WebGL preference keeps the legacy renderer" : "A real WebGPU pipeline finishes its first frame", webgl ? status.requested === "webgl" && status.stage === "disabled" && status.backend === "webgl" : status.stage === "ready" && status.actualBackend === "webgpu", status);
    if (!webgl) await page.waitForFunction(() => { const s = PumpkinVoxel.scene.villageRendererStatus; return s.stage === "fallback" || s.backend === "webgpu" && s.frames >= 3; }, null, { timeout: 180000 });
    await frames(); return readStatus();
  };
  const shot = async name => { await page.keyboard.press("Shift"); await frames(); await page.screenshot({ path: path.join(out, name), timeout: 180000 }); report.screenshots.push(name); console.log(`shot ${name}`); };
  const started = Date.now(); report.firstUse = { finalStatus: await open(), elapsedWallMs: Date.now() - started };
  if (!webgl) check("Native game draws continue on the genuine WebGPU backend", report.firstUse.finalStatus.backend === "webgpu" && report.firstUse.finalStatus.actualBackend === "webgpu" && report.firstUse.finalStatus.frames >= 3 && report.firstUse.finalStatus.stage === "ready", report.firstUse.finalStatus);
  await page.waitForFunction(() => PumpkinVoxel.scene.villageView.fidelityStats.sky.artReady, null, { timeout: 180000 });
  report.surface = await page.evaluate(() => {
    const p = PumpkinVoxel, scene = p.scene.villageView.scene, pointLights = [], ao = { meshes: 0, instances: 0, bytes: 0 };
    scene.traverse(o => {
      if (o.isPointLight) pointLights.push({ uuid: o.uuid, intensity: o.intensity, distance: o.distance });
      const a = o.geometry?.getAttribute?.("voxelAO"); if (a) { ao.meshes++; ao.instances += o.count; ao.bytes += a.array.byteLength; }
    });
    return { pointLights, ao, material: p.scene.villageView.surfaceMaterialStats, renderer: p.scene.villageRendererStatus, village: p.village.status, sky: p.scene.villageView.fidelityStats.sky };
  });
  check("The source village retains exactly eight pooled point lights", report.surface.pointLights.length === 8, report.surface.pointLights);
  check("Real instance attributes contain bounded neighbour AO", report.surface.ao.instances > 0 && report.surface.ao.bytes === report.surface.ao.instances * 8 && report.surface.material.ao.addedDraws === 0, report.surface.ao);
  check("The village owns one shared three-channel PBR atlas set", report.surface.material.pbr.textures === 3 && report.surface.material.pbr.additionalDraws === 0 && report.surface.material.pbr.bytes > 0, report.surface.material.pbr);
  if (!webgl) {
    const s = report.surface.renderer;
    check("GPU materials actually consume finish, AO, PBR and custom effects", s.materials.ready && s.materials.unsupported === 0 && s.materials.roles["voxel-ao"] > 0 && s.materials.roles["pbr-atlas"] > 0 && s.materials.roles.finish > 0 && s.materials.effectMaterials > 0, s.materials);
    check("The GPU mirror retains all eight actual point lights", s.lights?.point === report.surface.pointLights.length, s.lights);
    check("HDR bloom and the display grade run in the real GPU post pipeline", s.post?.hdr && s.post.bloom && s.post.displayGrade && s.post.toneMapping === "ACES" && s.post.output === "sRGB", s.post);
    check("The presentation canvas leaves HTML controls interactive", await page.locator(".village-webgpu-canvas").evaluate(c => !c.hidden && getComputedStyle(c).pointerEvents === "none" && c.getAttribute("aria-hidden") === "true"));
  }
  await shot(`${webgl ? "webgl" : "webgpu"}-world.png`);
  await page.locator('.vg-dock [data-vg-page="journal"]').click(); await page.waitForFunction(() => PumpkinVoxel.village.status.panel === "journal");
  check("The real HTML journal opens above the renderer", await page.locator("#vg-panel").evaluate(panel => !panel.hidden && panel.getAttribute("role") === "dialog" && !!panel.querySelector("button[data-vg-journal-tab]")));
  await shot(`${webgl ? "webgl" : "webgpu"}-journal.png`); await page.locator("#vg-panel-close").click();

  // No game/world frame is manually rendered. This is the same synchronous
  // legacy map operation the map button requests, with exact restoration checks.
  const atlas = await page.evaluate(() => {
    const p = PumpkinVoxel, view = p.scene.villageView, renderer = p.scene.debug.renderer, camera = view.camera;
    const saved = JSON.stringify(p.state()), target = renderer.getRenderTarget(), grade = view.scene.userData.grade;
    const cameraState = () => JSON.stringify({ p: camera.position.toArray(), q: camera.quaternion.toArray(), matrix: camera.matrixWorld.toArray(), projection: camera.projectionMatrix.toArray(), coordinateSystem: camera.coordinateSystem, target: view.controls?.target?.toArray() });
    const materials = []; view.scene.traverse(o => { if (o.material) materials.push([o, o.material]); });
    const lightState = () => JSON.stringify(view.scene.children.filter(o => o.isLight).map(o => [o.uuid, o.color.toArray(), o.intensity, o.groundColor?.toArray()]));
    const before = cameraState(), palette = lightState(), fidelity = JSON.stringify(view.fidelityStats), exposure = renderer.toneMappingExposure, tone = renderer.toneMapping, colour = renderer.outputColorSpace;
    const first = p.scene.captureVillageMap(), second = p.scene.captureVillageMap();
    return { url: first.url, width: first.width, height: first.height, cached: first === second, saveRestored: saved === JSON.stringify(p.state()), cameraRestored: before === cameraState(), materialsRestored: materials.every(([object, material]) => object.material === material), gradeRestored: grade === view.scene.userData.grade, paletteRestored: palette === lightState(), fidelityRestored: fidelity === JSON.stringify(view.fidelityStats), targetRestored: target === renderer.getRenderTarget(), outputRestored: exposure === renderer.toneMappingExposure && tone === renderer.toneMapping && colour === renderer.outputColorSpace };
  });
  const { url: atlasUrl, ...atlasResult } = atlas; report.atlas = atlasResult;
  check("The legacy actual-world atlas restores source camera, save, materials and output", Object.entries(atlasResult).filter(([key]) => key.endsWith("Restored") || key === "cached").every(([, value]) => value === true), atlasResult);
  check("The map is an actual bounded PNG snapshot", atlasUrl.startsWith("data:image/png;base64,") && atlas.width === 1280 && atlas.height === 800, { width: atlas.width, height: atlas.height });
  await fs.writeFile(path.join(out, "legacy-actual-world-atlas.png"), Buffer.from(atlasUrl.split(",")[1], "base64")); report.screenshots.push("legacy-actual-world-atlas.png");
  await frames();
  if (!webgl) { const status = await readStatus(); check("GPU presentation resumes after the legacy atlas capture", status.backend === "webgpu" && status.stage === "ready" && status.frames > report.surface.renderer.frames, status); }

  if (portrait) {
    await page.setViewportSize({ width: 390, height: 844 }); await frames();
    await page.locator('.vg-dock [data-vg-page="journal"]').click(); await shot(`${webgl ? "webgl" : "webgpu"}-portrait.png`);
    check("Portrait keeps the real journal and renderer within the viewport", await page.evaluate(() => {
      const panel = document.querySelector("#vg-panel"), rect = panel.getBoundingClientRect(); return !panel.hidden && rect.left >= -1 && rect.right <= innerWidth + 1 && rect.top >= -1 && rect.bottom <= innerHeight + 1 && document.documentElement.scrollWidth <= innerWidth + 1;
    }));
    await page.locator("#vg-panel-close").click(); await page.setViewportSize(report.viewport); await frames();
  }

  await page.evaluate(() => PumpkinVoxel.village.close()); await frames();
  const closed = await page.evaluate(() => ({ active: PumpkinVoxel.village.active, bodyVillage: document.body.classList.contains("in-village"), overlays: [...document.querySelectorAll(".village-webgpu-canvas")].map(c => ({ hidden: c.hidden })), renderer: PumpkinVoxel.scene.villageRendererStatus, playerEnabled: PumpkinVoxel.scene.player.enabled }));
  check("Returning to the farm removes the GPU overlay and restores farm play", !closed.active && !closed.bodyVillage && closed.overlays.every(c => c.hidden) && closed.renderer.backend === "webgl" && closed.playerEnabled, closed);
  await shot("returned-farm.png");
  const warmed = Date.now(), beforeWarm = await readStatus(); report.warmed = { initialStatus: beforeWarm, finalStatus: await open(), elapsedWallMs: Date.now() - warmed };
  if (!webgl) {
    await page.waitForFunction(previous => PumpkinVoxel.scene.villageRendererStatus.frames >= previous + 3 || PumpkinVoxel.scene.villageRendererStatus.stage === "fallback", beforeWarm.frames, { timeout: 180000 });
    report.warmed.finalStatus = await readStatus();
    report.warmed.elapsedWallMs = Date.now() - warmed;
    check("Warm re-entry draws three more native GPU frames with no fallback", report.warmed.finalStatus.stage === "ready" && report.warmed.finalStatus.backend === "webgpu" && report.warmed.finalStatus.frames >= beforeWarm.frames + 3, report.warmed.finalStatus);
  }
  await shot(`${webgl ? "webgl" : "webgpu"}-warm-world.png`);
  check("The run has no product page, shader/console or external request errors", report.errors.length === 0 && report.consoleErrors.length === 0 && report.externalRequests.length === 0 && report.failedRequests.length === 0, { errors: report.errors, consoleErrors: report.consoleErrors, externalRequests: report.externalRequests, failedRequests: report.failedRequests });
} catch (error) {
  report.failure = String(error.stack ?? error);
  if (page && !page.isClosed()) {
    report.lastRenderer = await page.evaluate(() => window.PumpkinVoxel?.scene?.villageRendererStatus ?? null).catch(() => null);
    await page.screenshot({ path: path.join(out, "failure.png"), timeout: 30000 }).then(() => report.screenshots.push("failure.png")).catch(() => {});
  }
} finally {
  report.passed = !report.failure && report.checks.length > 0 && report.checks.every(c => c.pass);
  await fs.writeFile(path.join(out, "browser.json"), JSON.stringify(report, null, 2));
  await browser?.close(); await new Promise(resolve => server.close(resolve));
}
console.log(JSON.stringify({ passed: report.passed, htmlSha256: report.htmlSha256, checks: report.checks.length, failure: report.failure, finalRenderer: report.warmed?.finalStatus ?? report.lastRenderer }));
if (!report.passed) process.exitCode = 1;
