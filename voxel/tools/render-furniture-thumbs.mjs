// Rebuild the shop's transparent thumbnails directly from the native voxel models.
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
import { chromium } from "playwright";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2), at = args.indexOf("--out");
const out = path.resolve(at >= 0 ? args[at + 1] : path.join(root, "assets/premium-furniture-thumbs"));
const sheetAt = args.indexOf("--sheet"), sheet = sheetAt >= 0 ? path.resolve(args[sheetAt + 1]) : null;
// Placement-only metadata can change without changing any rendered geometry.
if (args.includes("--metadata-only")) {
  const { PREMIUM_FURNITURE_ITEMS, premiumFurnitureStats } = await import("../src/premium-furniture-props.js");
  for (const item of PREMIUM_FURNITURE_ITEMS) if (!fs.existsSync(path.join(out, `${item.id}.png`))) throw new Error(`Missing thumbnail for ${item.id}; run a full render first.`);
  const models = Object.fromEntries(PREMIUM_FURNITURE_ITEMS.map((item) => [item.id, premiumFurnitureStats(item.id)]));
  fs.writeFileSync(path.join(out, "manifest.json"), JSON.stringify({ generatedBy: "voxel/tools/render-furniture-thumbs.mjs", size: 256, transparent: true, models }, null, 2) + "\n");
  console.log(`Updated placement metadata for ${PREMIUM_FURNITURE_ITEMS.length} existing thumbnails`);
  process.exit(0);
}
const bundle = await esbuild.build({ entryPoints: [path.join(root, "tools/furniture-thumbs.page.js")], bundle: true, write: false, format: "iife", target: ["es2020"], minify: true });
const html = `<!doctype html><meta charset="utf-8"><script>${bundle.outputFiles[0].text.replace(/<\/script/gi, "<\\/script")}</script>`;
const server = http.createServer((req, res) => { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); res.end(html); });
await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const page = await browser.newPage({ viewport: { width: 256, height: 256 }, deviceScaleFactor: 1 });
  const errors = []; page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(() => window.furnitureThumbResult || window.furnitureThumbError, null, { timeout: 120000 });
  const { result, error } = await page.evaluate(() => ({ result: window.furnitureThumbResult, error: window.furnitureThumbError }));
  if (error || errors.length) throw new Error(error || errors.join("\n"));
  fs.mkdirSync(out, { recursive: true });
  for (const [id, url] of Object.entries(result.images)) fs.writeFileSync(path.join(out, `${id}.png`), Buffer.from(url.split(",")[1], "base64"));
  fs.writeFileSync(path.join(out, "manifest.json"), JSON.stringify({ generatedBy: "voxel/tools/render-furniture-thumbs.mjs", size: 256, transparent: true, models: result.stats }, null, 2) + "\n");
  console.log(`Rendered ${Object.keys(result.images).length} native voxel thumbnails to ${out}`);
  if (sheet) {
    const { PREMIUM_FURNITURE_ITEMS } = await import("../src/premium-furniture-props.js");
    const names = Object.fromEntries(PREMIUM_FURNITURE_ITEMS.map((item) => [item.id, item.name]));
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.setContent(`<style>*{box-sizing:border-box}body{margin:0;padding:38px 52px;background:#211927;color:#fff0d7;font-family:Arial,sans-serif}small{font-size:13px;letter-spacing:3px;color:#e9b068}h1{font:36px Georgia,serif;margin:12px 0 6px}p{color:#c9b7ce;font-size:15px;margin:0}.grid{margin-top:27px;display:grid;grid-template-columns:repeat(3,1fr);gap:20px}.card{height:332px;border:1px solid #c9b7ce28;background:#2c2032;border-radius:18px;text-align:center;padding:16px 10px}.card img{display:block;width:256px;height:256px;margin:0 auto 9px}.card span{font-size:16px;color:#fff0d7}</style><small>PUMPKIN PATCH · NATIVE VOXEL DECOR</small><h1>The midnight furniture collection</h1><p>Kitchen heirlooms & bedroom treasures · Six fully modelled floor pieces</p><div class="grid">${Object.entries(result.images).map(([id, image]) => `<div class="card"><img src="${image}" alt=""><span>${names[id] || id}</span></div>`).join("")}</div>`);
    await page.evaluate(() => Promise.all([...document.images].map((image) => image.complete ? Promise.resolve() : new Promise((resolve) => { image.onload = resolve; }))));
    fs.mkdirSync(path.dirname(sheet), { recursive: true });
    await page.screenshot({ path: sheet }); console.log(`Wrote contact sheet ${sheet}`);
  }
} finally {
  if (browser) await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
