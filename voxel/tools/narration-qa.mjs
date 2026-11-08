// Exercise packaged narration in one Chromium instance after building the HTML.
// Usage: node tools/narration-qa.mjs [file.html] [output-dir]
// Set NARRATION_QA_INTRO_ONLY=1 to omit the heavier village scene.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { chromium } from "playwright";
import * as M from "../src/model.js";
import { INTRO_LINES } from "../src/content/intro.js";
import { QUEST_BY_ID } from "../src/content/village-quests.js";
import { FOLK_BY_ID } from "../src/content/village-folk.js";
import { voiceKey, normalizeVoiceText } from "../src/ui/voice-key.js";
import { VOICE_SCRIPT } from "./voice-script.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const filename = path.resolve(process.argv[2] ?? path.join(root, "dist/pumpkin-patch-voxel.html"));
const output = path.resolve(process.argv[3] ?? path.join(root, "docs/contractor-patches/mothlight-voices/verification/browser"));
const html = await fs.readFile(filename);
const manifest = JSON.parse(await fs.readFile(path.join(root, "assets/voices/mothlight-v1/voice-manifest.json"), "utf8"));
const recorded = new Set(manifest.clips.map(clip => clip.id));
await fs.mkdir(output, { recursive: true });
if (!html.includes(Buffer.from("data:audio/mpeg;base64,"))) {
  throw new Error("No packaged MP3 narration found. Generate the voice assets and rebuild before running narration QA.");
}

// The saved supper fixture reaches the authored multi-speaker scene without
// repeating the separate gameplay/progression suite. Travel and dialogue use UI.
const fixture = M.freshState();
fixture.introSeen = true; fixture.coins = 500; fixture.earned = M.LEVELS[2].at;
fixture.progression.claimed = [1, 2, 3]; fixture.progression.pending = [];
fixture.progression.homeActivities.visit = 1;
fixture.visitorTimer = fixture.shop.arrivalTimer = 1e6;
fixture.village.invited = true;
fixture.village.quests.invitation = { step: 3, base: null, done: true };
fixture.village.claims.invitation = true;
fixture.village.quests["two-doorbells"] = { step: 2, base: null, done: false };
for (const who of ["rowan", "elowen"]) fixture.village.friends[who].met = true;
const report = {
  html: path.basename(filename), date: new Date().toISOString(),
  sha256: createHash("sha256").update(html).digest("hex"), bytes: html.length,
  scope: "Packaged game in Chromium/SwiftShader, one browser and one scene load. A declared level-three save stages Two Doorbells at its supper conversation. Recorded lines require native playback; unrecorded authored lines require readable, silent fallback with correct speakers and working choices. Native media events and decoded durations verify playback; this does not claim a human listened to the generated performances. Viewport emulation is not physical-device certification.",
  coverage: { authored: VOICE_SCRIPT.length, recorded: recorded.size, missing: VOICE_SCRIPT.filter(line => !recorded.has(line.id)).length, note: "Passing fallback checks does not establish recorded voice coverage for missing clips." },
  fixture: { level: M.patchLevel(fixture).level, coins: fixture.coins, supperStep: 2 },
  checks: [], media: [], silentFallbacks: [], metrics: [], screenshots: [], errors: [], externalRequests: [],
};
function check(pass, label, detail) {
  report.checks.push({ pass: !!pass, label, ...(detail === undefined ? {} : { detail }) });
  console.log(`${pass ? "PASS" : "FAIL"} ${label}`);
  if (!pass) throw new Error(label);
}
const server = createServer((request, response) => {
  if (request.url === "/favicon.ico") { response.writeHead(204); response.end(); return; }
  response.setHeader("Content-Type", "text/html"); response.end(html);
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser, page;
const click = async selector => {
  const button = page.locator(selector).first();
  await button.waitFor({ state: "visible" });
  // A native click supplies the activation browsers require for audio.
  await button.click({ force: true });
};
const audioState = () => page.evaluate(() => ({
  enabled: PumpkinVoxel.narration.enabled,
  playing: PumpkinVoxel.narration.playing,
  volume: PumpkinVoxel.narration.volume,
  current: PumpkinVoxel.narration.current,
  music: PumpkinVoxel.audio.status,
  media: window.__narrationQA.snapshot(),
}));
async function playing(label, speaker, text) {
  await page.waitForFunction(({ speaker, text }) => {
    const n = PumpkinVoxel.narration, current = n.current;
    return n.playing && current?.speaker === speaker && (!text || current.text === text)
      && window.__narrationQA.snapshot().some(m => !m.paused && m.duration > 0 && m.playingEvents > 0);
  }, { speaker, text }, { timeout: 30000, polling: 50 });
  const state = await audioState(), live = state.media.filter(m => !m.paused && !m.ended && m.hasSource);
  check(state.playing && live.length === 1, `${label}: exactly one native audio source plays`, state.current);
  check(live[0].duration > 0 && live[0].playingEvents > 0 && live[0].local,
    `${label}: bundled MP3 decodes and emits playing`, { duration: live[0].duration, readyState: live[0].readyState });
  report.media.push({ label, current: state.current, duration: live[0].duration, id: live[0].id });
  return live[0].id;
}
async function stopped(label, previousId) {
  const state = await audioState(), old = state.media.find(m => m.id === previousId);
  check(!state.playing && state.media.every(m => m.paused || m.ended || !m.hasSource), `${label}: narration stops`);
  if (previousId !== undefined) check(old?.paused && !old.hasSource, `${label}: previous media source is released`);
}
async function released(label, previousId) {
  const state = await audioState(), old = state.media.find(m => m.id === previousId);
  if (previousId !== undefined) check(old?.paused && !old.hasSource, `${label}: previous media source is released`);
  check(state.media.filter(m => !m.paused && !m.ended && m.hasSource).length <= 1, `${label}: no overlapping sources`);
}
// Coverage comes from the generated manifest, so an incomplete batch must
// prove readable fallback rather than silently claiming a missing clip played.
async function conversationLine(label, speaker, text) {
  if (recorded.has(voiceKey(speaker, text))) return playing(label, speaker, normalizeVoiceText(text));
  const state = await audioState();
  check(state.current?.speaker === speaker && state.current.text === normalizeVoiceText(text) && state.current.status === "missing" && !state.current.available,
    `${label}: an unrecorded line retains the correct speaker and missing status`, state.current);
  check(await page.locator(".village-dialogue-line").textContent() === text, `${label}: unrecorded dialogue remains readable`);
  await stopped(label + " silent fallback");
  report.silentFallbacks.push({ label, speaker, key: voiceKey(speaker, text) });
  return undefined;
}
async function screenshot(name) {
  const file = `narration-${name}.png`;
  await page.screenshot({ path: path.join(output, file), timeout: 180000 });
  report.screenshots.push(file); console.log(`SHOT ${file}`);
}
async function controlMetrics(name, selector) {
  const value = await page.evaluate(selector => {
    const visible = el => el.getClientRects().length && getComputedStyle(el).visibility !== "hidden";
    const controls = [...document.querySelectorAll(`${selector} button`)].filter(visible).map(el => {
      const b = el.getBoundingClientRect(), css = getComputedStyle(el);
      return { label: el.getAttribute("aria-label") ?? el.textContent.trim(), x: b.x, y: b.y, width: b.width, height: b.height, font: parseFloat(css.fontSize), icon: !!el.querySelector("svg") };
    });
    return { viewport: [innerWidth, innerHeight], overflow: document.documentElement.scrollWidth > innerWidth + 1, controls };
  }, selector);
  report.metrics.push({ name, ...value });
  check(!value.overflow, `${name}: no horizontal overflow`);
  check(value.controls.length >= 3 && value.controls.every(b => b.width >= 43.5 && b.height >= 43.5), `${name}: controls meet 44px targets`, value.controls);
  check(value.controls.every(b => b.x >= -.5 && b.y >= -.5 && b.x + b.width <= value.viewport[0] + .5 && b.y + b.height <= value.viewport[1] + .5), `${name}: controls remain within the viewport`);
  check(value.controls.every(b => b.icon || b.font >= 12), `${name}: button text remains at least 12px`);
}

try {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium", headless: true,
    args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  page = await browser.newPage({ viewport: { width: 1280, height: 800 }, hasTouch: true, reducedMotion: "reduce" });
  page.setDefaultTimeout(30000);
  page.on("pageerror", error => report.errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") report.errors.push(message.text()); });
  page.on("request", request => {
    const url = request.url();
    if (!url.startsWith(origin + "/") && !url.startsWith("data:") && !url.startsWith("blob:")) report.externalRequests.push(url);
  });
  await page.addInitScript(data => {
    const key = "pumpkin-patch-voxel-reference-v1";
    localStorage.setItem(key, JSON.stringify(data));
    localStorage.setItem(key + "-prefs", JSON.stringify({ music: true, sound: false, glow: false, shadows: false, mist: false, lakeLights: false, voiceEnabled: true, voiceVolume: .85 }));
    const NativeAudio = window.Audio, records = [];
    // Observe native media without changing its load, playback or failure paths.
    window.Audio = function (...args) {
      const element = new NativeAudio(...args);
      const record = { element, id: records.length, playingEvents: 0, decodedDuration: 0, local: /^data:audio\//i.test(args[0] ?? "") || /^blob:/.test(args[0] ?? "") };
      element.addEventListener("playing", () => record.playingEvents++);
      element.addEventListener("loadedmetadata", () => { if (Number.isFinite(element.duration)) record.decodedDuration = element.duration; });
      records.push(record); return element;
    };
    window.Audio.prototype = NativeAudio.prototype;
    window.__narrationQA = { snapshot: () => records.map(({ element: e, ...record }) => ({
      ...record, duration: Number.isFinite(e.duration) ? e.duration : record.decodedDuration,
      currentTime: e.currentTime, paused: e.paused, ended: e.ended, readyState: e.readyState,
      hasSource: !!e.getAttribute("src"), error: e.error?.code ?? null,
    })) };
  }, M.saveData(fixture));
  await page.goto(origin + "/game.html", { waitUntil: "domcontentloaded", timeout: 180000 });
  await page.waitForSelector("body[data-ready]", { timeout: 180000 });
  check(await page.evaluate(() => !!PumpkinVoxel.narration), "the packaged game exposes narration diagnostics");
  await click("#open-settings"); await click("#watch-intro");
  check(await page.locator('[data-intro-next]').textContent() === "Begin", "Watch again opens the title card");
  await click("[data-intro-next]");
  const first = INTRO_LINES[0], second = INTRO_LINES[1];
  const firstId = await playing("Begin", first.who, first.text);
  await click("[data-intro-next]");
  const secondId = await playing("Next", second.who, second.text);
  await released("Next", firstId);
  const step = await page.evaluate(() => PumpkinVoxel.intro.step);
  await click("#intro [data-voice-replay]");
  await playing("Replay", second.who, second.text); await released("Replay", secondId);
  check(await page.evaluate(expected => PumpkinVoxel.intro.step === expected, step), "Replay does not advance the introduction");
  for (const [name, width, height] of [["desktop",1280,800],["phone",390,844],["fold",960,880],["landscape",844,390]]) {
    await page.setViewportSize({ width, height });
    await controlMetrics(name + " introduction", "#intro");
    await screenshot(name + "-intro-controls");
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  await click("#intro [data-voice-replay]");
  const skipId = await playing("Before Skip", second.who, second.text);
  await click("[data-intro-skip]"); await stopped("Skip", skipId);
  check(await page.locator("#intro").isHidden(), "Skip returns to the farm");
  await click("#open-settings");
  const musicBefore = await page.evaluate(() => ({ enabled: JSON.parse(localStorage.getItem("pumpkin-patch-voxel-reference-v1-prefs")).music, status: PumpkinVoxel.audio.status }));
  await click("#toggle-voice");
  const disabled = await audioState();
  check(!disabled.enabled && !disabled.playing, "Settings turns voice narration off");
  check(await page.evaluate(before => {
    const prefs = JSON.parse(localStorage.getItem("pumpkin-patch-voxel-reference-v1-prefs"));
    return prefs.music === before.enabled && PumpkinVoxel.audio.status.playing === before.status.playing && PumpkinVoxel.audio.status.track === before.status.track;
  }, musicBefore), "Voice toggle preserves the independent music setting and playback");
  await click("#watch-intro"); await click("[data-intro-next]");
  check(await page.evaluate(() => !PumpkinVoxel.narration.playing && !!document.querySelector(".intro-line").textContent.trim()), "Voices off leaves the introduction readable");
  await click("#intro [data-voice-toggle]");
  await playing("Inline voices on", first.who, first.text);
  await click("[data-intro-skip]");
  await click("#open-settings");
  const voiceBeforeMusic = await page.evaluate(() => PumpkinVoxel.narration.enabled);
  await click("#toggle-music");
  check(await page.evaluate(expected => PumpkinVoxel.narration.enabled === expected, voiceBeforeMusic), "Music toggle preserves the independent voice setting");
  await page.locator("#voice-volume").evaluate(input => { input.value = "0.4"; input.dispatchEvent(new Event("input", { bubbles: true })); });
  check(await page.evaluate(() => PumpkinVoxel.narration.volume === .4), "Voice volume changes through Settings");
  await screenshot("desktop-voice-settings"); await click("#sheet-close");

  if (process.env.NARRATION_QA_INTRO_ONLY !== "1") {
    await click('[data-tab="more"]'); await click('[data-more="village"]');
    await page.waitForFunction(() => PumpkinVoxel.village.status.touring, null, { timeout: 180000, polling: 100 });
    // Replaying the visible tour stop avoids depending on its camera timing.
    await click("#vg-tour [data-voice-replay]");
    const tourId = await playing("Village tour", "narrator");
    await screenshot("desktop-tour-controls");
    await click("#vg-tour-skip"); await stopped("Skip tour", tourId);
    check(await page.evaluate(() => !PumpkinVoxel.village.status.touring && PumpkinVoxel.state().village.toured), "Skip tour returns control to village play");
    await click('[data-vg-page="people"]'); await click('[data-vg-meet="rowan"]');
    const supper = QUEST_BY_ID["two-doorbells"].talk.rowan;
    const rowanId = await conversationLine("Supper opening", "rowan", supper[0].text);
    await click("[data-village-dialogue-next]");
    const elowenId = await conversationLine("Supper second speaker", "elowen", supper[1].text);
    await released("Conversation Continue", rowanId);
    check(await page.locator("#village-dialogue-name").textContent() === FOLK_BY_ID.elowen.name, "Conversation heading follows the current speaker");
    await screenshot("desktop-multispeaker-dialogue-controls");
    await click("[data-village-dialogue-next]"); await stopped("Reply choices", elowenId);
    check(await page.locator("#village-dialogue [data-voice-replay]").isDisabled(), "The silent reply prompt disables replay");
    await click('[data-village-choice="0"]');
    const replyId = await conversationLine("Supper reply", "elowen", supper[2].choices[0].reply);
    check(await page.locator("#village-dialogue-name").textContent() === FOLK_BY_ID.elowen.name, "An unlabelled reply inherits the current speaker");
    const beforeReplay = await page.evaluate(() => JSON.stringify({ coins: PumpkinVoxel.state().coins, quests: PumpkinVoxel.state().village.quests, claims: PumpkinVoxel.state().village.claims }));
    if (recorded.has(voiceKey("elowen", supper[2].choices[0].reply))) {
      await click("#village-dialogue [data-voice-replay]"); await conversationLine("Supper reply replay", "elowen", supper[2].choices[0].reply);
      await released("Reply replay", replyId);
    } else {
      check(await page.locator("#village-dialogue [data-voice-replay]").isDisabled(), "An unrecorded line disables unavailable replay");
      await page.locator("#village-dialogue [data-voice-replay]").evaluate(button => button.click());
      await stopped("Unavailable replay");
    }
    check(await page.evaluate(expected => JSON.stringify({ coins: PumpkinVoxel.state().coins, quests: PumpkinVoxel.state().village.quests, claims: PumpkinVoxel.state().village.claims }) === expected, beforeReplay), "Replaying dialogue does not alter quests or rewards");
    const doneId = (await audioState()).media.filter(m => !m.paused && m.hasSource).at(-1)?.id;
    await click("[data-village-dialogue-next]"); await stopped("Conversation Done", doneId);
    check(await page.locator("#village-dialogue").isHidden(), "Done closes the conversation");
    check(await page.evaluate(() => PumpkinVoxel.state().village.quests["two-doorbells"].done), "The supper's readable dialogue still completes its quest callback");

    // Elowen's first chat is in the initial recording batch. This exercises
    // actual recorded replies as well as the later chapter's silent fallback.
    await click('[data-vg-page="people"]'); await click('[data-vg-meet="elowen"]');
    await click('[data-vg-chat="elowen"]');
    const chat = FOLK_BY_ID.elowen.chats[0];
    check(chat.lines.every(text => recorded.has(voiceKey("elowen", text))) && recorded.has(voiceKey("elowen", chat.choices[0].reply)), "The real Elowen chat and selected reply have generated recordings");
    const chatFirstId = await playing("Recorded chat opening", "elowen", chat.lines[0]);
    await click("[data-village-dialogue-next]");
    const chatSecondId = await playing("Recorded chat Continue", "elowen", chat.lines[1]);
    await released("Recorded chat Continue", chatFirstId);
    await controlMetrics("desktop recorded dialogue", "#village-dialogue");
    await screenshot("desktop-recorded-dialogue-controls");
    await click("[data-village-dialogue-next]"); await stopped("Recorded chat choices", chatSecondId);
    await click('[data-village-choice="0"]');
    const recordedReplyId = await playing("Recorded chat reply", "elowen", chat.choices[0].reply);
    const chatsAfterReply = await page.evaluate(() => PumpkinVoxel.state().village.stats.chats);
    await click("#village-dialogue [data-voice-replay]");
    const replayId = await playing("Recorded reply replay", "elowen", chat.choices[0].reply);
    await released("Recorded reply replay", recordedReplyId);
    check(await page.evaluate(count => PumpkinVoxel.state().village.stats.chats === count, chatsAfterReply), "Replaying the recorded reply does not repeat its chat callback");
    await click("[data-village-dialogue-next]"); await stopped("Recorded conversation Done", replayId);
    check(await page.locator("#village-dialogue").isHidden(), "Done closes the recorded conversation");
    await click('[data-vg-page="people"]'); await click('[data-vg-meet="elowen"]');
    await click('[data-vg-chat="elowen"]');
    const closeId = await playing("Recorded greeting", "elowen", FOLK_BY_ID.elowen.greet[0]);
    await click("[data-village-dialogue-close]"); await stopped("Recorded conversation close", closeId);
  }
  check(!report.externalRequests.length, "Narration and the game make no external requests", report.externalRequests);
  check(!report.errors.length, "Narration flow has no page or console errors", report.errors);
} catch (error) {
  report.errors.push(error.stack ?? String(error)); console.error(error);
  if (page) await screenshot("failure").catch(() => {});
} finally {
  if (page) report.finalMedia = await page.evaluate(() => window.__narrationQA?.snapshot()).catch(() => null);
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
  report.passed = !report.errors.length && report.checks.every(c => c.pass);
  await fs.writeFile(path.join(output, "narration-report.json"), JSON.stringify(report, null, 2) + "\n");
}
console.log(JSON.stringify({ passed: report.passed, checks: report.checks.length, errors: report.errors.length, screenshots: report.screenshots.length, sha256: report.sha256 }));
if (!report.passed) process.exitCode = 1;
