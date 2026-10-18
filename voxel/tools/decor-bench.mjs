// The decor bench: renders catalogue pieces alone, lit like a room, from the
// room camera, a 3/4 view from each side, from behind and above, and flipped,
// beside the original art, into one PNG contact sheet.
//   node tools/decor-bench.mjs f06 f01 f11 --out /path/sheet.png
//   options: --views room,left,right,back,top,side,flip   --cell 300   --pitch 22 (room camera, degrees)
// Every run builds into its own temporary folder, so several can run at once.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
import { chromium } from "playwright";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2), opt = (name, fallback) => { const i = args.indexOf("--" + name); return i >= 0 ? args.splice(i, 2)[1] : fallback; };
const out = path.resolve(opt("out", "decor-bench.png")), views = opt("views", ""), cell = opt("cell", ""), pitch = opt("pitch", "");
const ids = args.filter((a) => /^[fd]\d\d$/.test(a));
if (!ids.length) { console.error("usage: node tools/decor-bench.mjs f06 [f01 ...] [--out sheet.png] [--views room,left,right,back,top,side,flip] [--cell 300] [--pitch 22]"); process.exit(1); }

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "decor-bench-"));
try {
  await esbuild.build({ entryPoints: [path.join(root, "tools/decor-bench.page.js")], bundle: true, outfile: path.join(tmp, "bench.js"), format: "iife", target: ["es2020"], loader: { ".png": "dataurl", ".webp": "dataurl" }, logLevel: "warning" });
  fs.writeFileSync(path.join(tmp, "bench.html"), `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#140f1c"><script src="bench.js"></script>`);
  const local = "/opt/pw-browsers/chromium", browser = await chromium.launch({ ...(fs.existsSync(local) ? { executablePath: local } : {}), args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } }), errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errors.push(m.text()); });
  const query = new URLSearchParams({ ids: ids.join(","), ...(views && { views }), ...(cell && { cell }), ...(pitch && { pitch }) });
  await page.goto(`file://${path.join(tmp, "bench.html")}?${query}`);
  await page.waitForFunction(() => window.benchResult || window.benchError, null, { timeout: 600000 });
  const { result, error, stats } = await page.evaluate(() => ({ result: window.benchResult, error: window.benchError, stats: window.benchStats }));
  await browser.close();
  if (error) throw new Error(error);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.from(result.split(",")[1], "base64"));
  for (const [id, s] of Object.entries(stats)) console.log(id, JSON.stringify(s));
  if (errors.length) console.log("page messages:\n  " + errors.join("\n  "));
  console.log("wrote", out);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
