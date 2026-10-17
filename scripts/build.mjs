// Builds the game from src/ and assets/.
//
//   npm run build   -> dist/pumpkin-patch.html, one offline file with every
//                      asset inlined (the file you share or put in the APK)
//   npm run build:android
//                   -> dist/android/index.html + android-shell.js, the two
//                      files the Android app loads from its assets folder
//   npm run dev     -> serves dist/dev/ on http://localhost:8000 with real
//                      asset files, rebuilding whenever src/ changes
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dev = process.argv.includes("--dev");
const android = process.argv.includes("--android");
const outDir = path.join(root, "dist", dev ? "dev" : android ? "android" : "");
const outName = dev || android ? "index.html" : "pumpkin-patch.html";
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

const MIME = { ".webp": "image/webp", ".svg": "image/svg+xml", ".png": "image/png", ".mp3": "audio/mpeg", ".woff": "font/woff", ".woff2": "font/woff2" };
// Joined in this order. legacy.css is the pre-3.0 stylesheet; the overhaul's
// rules come after it and replace it one screen at a time (docs/UI-OVERHAUL.md).
const STYLESHEETS = ["src/styles/tokens.css", "src/styles/legacy.css", "src/styles/shell.css"];
// Folders whose files the game code may request by path through asset().
const RUNTIME_ASSET_DIRS = ["assets/house", "assets/ui"];

const dataUri = (rel) => {
  const file = path.join(root, rel);
  const mime = MIME[path.extname(rel)];
  if (!mime) throw new Error(`No MIME type for ${rel}`);
  if (!fs.existsSync(file)) throw new Error(`Missing asset ${rel}`);
  return `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;
};
// Replace assets/... references in HTML attributes and CSS url() with data URIs.
const inlineRefs = (text) => text
  .replace(/(src|href)="(assets\/[^"]+)"/g, (m, attr, rel) => `${attr}="${dataUri(rel)}"`)
  .replace(/url\('(assets\/[^']+)'\)/g, (m, rel) => `url('${dataUri(rel)}')`);

const listFiles = (dir) => fs.readdirSync(path.join(root, dir), { withFileTypes: true })
  .flatMap((e) => e.isDirectory() ? listFiles(path.posix.join(dir, e.name)) : [path.posix.join(dir, e.name)])
  .sort();

function assemble(script) {
  const template = fs.readFileSync(path.join(root, "src/index.html"), "utf8");
  const css = STYLESHEETS.map((f) => fs.readFileSync(path.join(root, f), "utf8")).join("\n");
  let assets = "";
  let html = template;
  if (dev) {
    assets = "globalThis.PumpkinPatchAssets = {};";
  } else {
    const map = Object.fromEntries(RUNTIME_ASSET_DIRS.flatMap(listFiles).filter((f) => MIME[path.extname(f)]).map((f) => [f, dataUri(f)]));
    assets = `globalThis.PumpkinPatchAssets=${JSON.stringify(map)};`;
    html = inlineRefs(html);
  }
  // The Android shell must run before the game to install WebView polyfills.
  if (android) html = html.replace("<head>", '<head><script src="android-shell.js"></script>');
  // Function replacers: the payloads contain "$" sequences.
  return html
    .replace("/* @build:style */", () => dev ? css : inlineRefs(css))
    .replace("/* @build:assets */", () => assets)
    .replace("/* @build:script */", () => script.replace(/<\/script/gi, "<\\/script"));
}

const writeHtml = {
  name: "write-html",
  setup(build) {
    build.onEnd((result) => {
      if (result.errors.length) return;
      const script = result.outputFiles.find((f) => f.path.endsWith(".js")).text;
      const file = path.join(outDir, outName);
      fs.mkdirSync(outDir, { recursive: true });
      if (android) fs.copyFileSync(path.join(root, "android/android-shell.js"), path.join(outDir, "android-shell.js"));
      fs.writeFileSync(file, assemble(script));
      const mb = (fs.statSync(file).size / 1048576).toFixed(1);
      console.log(`${new Date().toLocaleTimeString()} built ${path.relative(root, file)} (${mb} MB)`);
    });
  },
};

const options = {
  entryPoints: [path.join(root, "src/main.js")],
  bundle: true,
  format: "iife",
  globalName: "PumpkinPatch",
  target: ["es2020"],
  charset: "utf8",
  write: false,
  outfile: path.join(outDir, "game.js"),
  banner: { js: `// Pumpkin Patch ${pkg.version}. Generated from src/main.js by npm run build; edit the source files.` },
  define: { __GAME_VERSION__: JSON.stringify(pkg.version) },
  logLevel: "warning",
  plugins: [writeHtml],
};

if (dev) {
  fs.mkdirSync(outDir, { recursive: true });
  const link = path.join(outDir, "assets");
  if (!fs.existsSync(link)) fs.symlinkSync(path.join(root, "assets"), link, "dir");
  const ctx = await esbuild.context(options);
  await ctx.watch();
  // CSS and HTML are not part of the JS graph, so rebuild on their changes too.
  for (const f of ["src/index.html", ...STYLESHEETS]) fs.watchFile(path.join(root, f), { interval: 300 }, () => ctx.rebuild());
  const { port } = await ctx.serve({ servedir: outDir, port: 8000 });
  console.log(`Pumpkin Patch dev server: http://localhost:${port}/`);
} else {
  await esbuild.build(options);
}
