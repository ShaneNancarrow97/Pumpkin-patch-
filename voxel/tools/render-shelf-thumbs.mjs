// Rebuilds the blank shelves' icon sheet (assets/shelf-thumbs/shelves.webp) from
// the voxel models, every shelf in every finish. Run it after changing a shelf,
// a finish or the catalogue's order:
//   node tools/render-shelf-thumbs.mjs [--cell 112] [--png /path/preview.png]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
import { chromium } from "playwright";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2), opt = (name, fallback) => { const i = args.indexOf("--" + name); return i >= 0 ? args[i + 1] : fallback; };
const out = path.join(root, "assets/shelf-thumbs"), cell = opt("cell", "112"), png = opt("png", null);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "shelf-thumbs-"));
let browser;
try {
  await esbuild.build({ entryPoints: [path.join(root, "tools/shelf-thumbs.page.js")], bundle: true, outfile: path.join(tmp, "page.js"), format: "iife", target: ["es2020"], loader: { ".png": "dataurl", ".webp": "dataurl" }, logLevel: "warning" });
  fs.writeFileSync(path.join(tmp, "page.html"), `<!doctype html><meta charset="utf-8"><body><script src="page.js"></script>`);
  const local = "/opt/pw-browsers/chromium";
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || (fs.existsSync(local) ? local : undefined), args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const page = await browser.newPage(), errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`file://${path.join(tmp, "page.html")}?cell=${cell}`);
  await page.waitForFunction(() => window.shelfThumbResult || window.shelfThumbError, null, { timeout: 600000 });
  const { result, error } = await page.evaluate(() => ({ result: window.shelfThumbResult, error: window.shelfThumbError }));
  if (error || errors.length) throw new Error(error || errors.join("\n"));
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, "shelves.webp"), Buffer.from(result.sheet.split(",")[1], "base64"));
  fs.writeFileSync(path.join(out, "manifest.json"), JSON.stringify({ generatedBy: "voxel/tools/render-shelf-thumbs.mjs", ...result.layout, models: result.stats }, null, 2) + "\n");
  if (png) fs.writeFileSync(path.resolve(png), Buffer.from(result.png.split(",")[1], "base64"));
  console.log(`Rendered ${Object.keys(result.stats).length} shelf icons to ${path.relative(root, out)}/shelves.webp (${(fs.statSync(path.join(out, "shelves.webp")).size / 1024).toFixed(0)} KB)`);
} finally {
  if (browser) await browser.close();
  fs.rmSync(tmp, { recursive: true, force: true });
}
