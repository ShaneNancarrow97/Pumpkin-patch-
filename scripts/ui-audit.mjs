// Measures the interface against the rules in docs/UI-OVERHAUL.md, at the
// screen sizes we support, on the Patch screen of a fresh game.
//
//   node scripts/ui-audit.mjs [file.html] [--strict] [--screens dir]
//
// Without --strict it only reports. --screens saves a screenshot per size.
// Set CHROMIUM_PATH to use a preinstalled browser.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const args = process.argv.slice(2);
const strict = args.includes("--strict");
const screensAt = args.indexOf("--screens");
const screens = screensAt >= 0 ? args.splice(screensAt, 2)[1] : null;
const file = path.resolve(args.find((a) => !a.startsWith("--")) ?? "dist/pumpkin-patch.html");

export const SIZES = [
  ["phone", 390, 844],
  ["small phone", 360, 740],
  ["landscape", 844, 390],
  ["fold7 cover", 412, 915],
  ["fold7 inner", 984, 1092],
  ["fold7 inner turned", 1092, 984],
  ["tablet", 820, 1180],
  ["desktop", 1280, 800],
];
export const RULES = { farmShare: 0.7, minFont: 12, minTarget: 44 };

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const rows = [];
for (const [name, width, height] of SIZES) {
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: name !== "desktop" });
  const page = await context.newPage();
  await page.goto(pathToFileURL(file).href);
  await page.waitForFunction(() => globalThis.PumpkinPatch?.app?.state);
  await page.waitForTimeout(600);
  const m = await page.evaluate(({ minFont, minTarget }) => {
    const shown = (el) => {
      const r = el.getBoundingClientRect(), s = getComputedStyle(el);
      return r.width > 1 && r.height > 1 && s.visibility !== "hidden" && s.display !== "none" && +s.opacity > 0.05 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
    };
    // The map and everything drawn or placed on it (plots, buildings, signs) is farm.
    const farm = (el) => !!el && (el.id === "world-viewport" || !!el.closest("#world"));
    let open = 0, total = 0;
    for (let y = 4; y < innerHeight; y += 8) for (let x = 4; x < innerWidth; x += 8) {
      total++;
      if (farm(document.elementFromPoint(x, y))) open++;
    }
    const pumpkin = document.getElementById("click-pumpkin").getBoundingClientRect();
    const centre = document.elementFromPoint(pumpkin.left + pumpkin.width / 2, pumpkin.top + pumpkin.height / 2);
    const onScreen = (Math.max(0, Math.min(innerWidth, pumpkin.right) - Math.max(0, pumpkin.left)) * Math.max(0, Math.min(innerHeight, pumpkin.bottom) - Math.max(0, pumpkin.top))) / (pumpkin.width * pumpkin.height);
    const pumpkinVisible = onScreen >= 0.6 && centre?.id === "click-pumpkin";
    // Lettering painted on the map's signs scales with the art, so it is not interface text.
    const texts = [...document.querySelectorAll("body *")].filter((el) => shown(el) && !el.closest(".world-label") && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()));
    const small = texts.filter((el) => parseFloat(getComputedStyle(el).fontSize) < minFont)
      .map((el) => `${Math.round(parseFloat(getComputedStyle(el).fontSize) * 10) / 10}px "${el.textContent.trim().slice(0, 20)}"`);
    const controls = [...document.querySelectorAll("button, a[href], select, input, [role=button]")].filter(shown);
    const tiny = controls.filter((el) => { const r = el.getBoundingClientRect(); return r.width < minTarget - 0.5 || r.height < minTarget - 0.5; })
      .map((el) => { const r = el.getBoundingClientRect(); return `${Math.round(r.width)}×${Math.round(r.height)} ${el.id || el.textContent.trim().slice(0, 16)}`; });
    return {
      farmShare: Math.round((open / total) * 100) / 100,
      pumpkinVisible,
      smallText: small,
      tinyTargets: tiny,
      sideScroll: document.scrollingElement.scrollWidth > innerWidth + 1,
    };
  }, RULES);
  const failures = [];
  if (m.farmShare < RULES.farmShare) failures.push(`farm ${Math.round(m.farmShare * 100)}% < ${RULES.farmShare * 100}%`);
  if (!m.pumpkinVisible) failures.push("big pumpkin not visible");
  if (m.smallText.length) failures.push(`${m.smallText.length} text under ${RULES.minFont}px`);
  if (m.tinyTargets.length) failures.push(`${m.tinyTargets.length} targets under ${RULES.minTarget}px`);
  if (m.sideScroll) failures.push("page scrolls sideways");
  rows.push({ name, width, height, ...m, failures });
  if (screens) {
    fs.mkdirSync(screens, { recursive: true });
    await page.screenshot({ path: path.join(screens, `${name.replace(/ /g, "-")}-${width}x${height}.png`) });
  }
  await context.close();
}
await browser.close();

console.log("| Size | Farm visible | Pumpkin | Text < 12px | Targets < 44px | Side scroll | Result |");
console.log("| --- | --- | --- | --- | --- | --- | --- |");
for (const r of rows) {
  console.log(`| ${r.name} ${r.width}×${r.height} | ${Math.round(r.farmShare * 100)}% | ${r.pumpkinVisible ? "yes" : "**no**"} | ${r.smallText.length} | ${r.tinyTargets.length} | ${r.sideScroll ? "**yes**" : "no"} | ${r.failures.length ? "fails" : "passes"} |`);
}
for (const r of rows.filter((r) => r.smallText.length || r.tinyTargets.length)) {
  console.log(`\n${r.name}:`);
  if (r.smallText.length) console.log("  small text: " + r.smallText.slice(0, 8).join(", ") + (r.smallText.length > 8 ? ", …" : ""));
  if (r.tinyTargets.length) console.log("  small targets: " + r.tinyTargets.slice(0, 8).join(", ") + (r.tinyTargets.length > 8 ? ", …" : ""));
}
if (strict && rows.some((r) => r.failures.length)) process.exitCode = 1;
