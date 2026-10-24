// Builds the voxel reference into one offline file: dist/pumpkin-patch-voxel.html.
//   node build.mjs          one build
//   node build.mjs --dev    serve on http://localhost:8001 and rebuild on change
//   node build.mjs --out f  one build, written to f instead
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const root = path.dirname(fileURLToPath(import.meta.url));
// --readable leaves the code unminified, for profiling.
const dev = process.argv.includes("--dev"), readable = process.argv.includes("--readable"), at = process.argv.indexOf("--out"), outFile = at > 0 ? path.resolve(process.argv[at + 1]) : null;
const MIME = { ".woff": "font/woff", ".woff2": "font/woff2", ".png": "image/png" };
const inline = (css) => css.replace(/url\('(assets\/[^']+)'\)/g, (m, rel) => `url('data:${MIME[path.extname(rel)]};base64,${fs.readFileSync(path.join(root, rel)).toString("base64")}')`);

const writeHtml = {
  name: "write-html",
  setup(build) {
    build.onEnd((result) => {
      if (result.errors.length) return;
      const js = result.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
      const css = inline(["src/style.css", "src/icons.css", "src/ui/house-skins.css", "src/ui/maze-commerce.css", "src/ui/house-placement.css", "src/ui/intro.css", "src/ui/maze-ride.css", "src/ui/meadow-chat.css", "src/ui/upgrade-menu.css", "src/ui/hayride.css", "src/ui/hayride-ride.css"].map((f) => fs.readFileSync(path.join(root, f), "utf8")).join("\n"));
      const html = fs.readFileSync(path.join(root, "src/index.html"), "utf8")
        .replace("/* @build:style */", () => css).replace("/* @build:script */", () => js);
      const out = outFile ?? path.join(root, "dist", dev ? "index.html" : "pumpkin-patch-voxel.html");
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, html);
      console.log(`${new Date().toLocaleTimeString()} built ${path.relative(root, out)} (${(html.length / 1024).toFixed(0)} KB)`);
    });
  },
};
const options = { entryPoints: [path.join(root, "src/main.js")], bundle: true, loader: { ".png": "dataurl", ".webp": "dataurl", ".mp3": "dataurl", ".mid": "binary" }, format: "iife", minify: !dev && !readable, target: ["es2020"], write: false, outfile: "game.js", logLevel: "warning", plugins: [writeHtml] };
if (dev) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  for (const f of ["src/index.html", "src/style.css", "src/icons.css"]) fs.watchFile(path.join(root, f), { interval: 300 }, () => ctx.rebuild());
  const { port } = await ctx.serve({ servedir: path.join(root, "dist"), port: 8001 });
  console.log(`Voxel reference: http://localhost:${port}/`);
} else {
  await esbuild.build(options);
}
