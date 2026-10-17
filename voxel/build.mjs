// Builds the voxel reference into one offline file: dist/pumpkin-patch-voxel.html.
//   node build.mjs          one build
//   node build.mjs --dev    serve on http://localhost:8001 and rebuild on change
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const root = path.dirname(fileURLToPath(import.meta.url));
const dev = process.argv.includes("--dev");
const MIME = { ".woff": "font/woff", ".woff2": "font/woff2" };
const inline = (css) => css.replace(/url\('(assets\/[^']+)'\)/g, (m, rel) => `url('data:${MIME[path.extname(rel)]};base64,${fs.readFileSync(path.join(root, rel)).toString("base64")}')`);

const writeHtml = {
  name: "write-html",
  setup(build) {
    build.onEnd((result) => {
      if (result.errors.length) return;
      const js = result.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
      const css = inline(fs.readFileSync(path.join(root, "src/style.css"), "utf8"));
      const html = fs.readFileSync(path.join(root, "src/index.html"), "utf8")
        .replace("/* @build:style */", () => css).replace("/* @build:script */", () => js);
      fs.mkdirSync(path.join(root, "dist"), { recursive: true });
      const out = path.join(root, "dist", dev ? "index.html" : "pumpkin-patch-voxel.html");
      fs.writeFileSync(out, html);
      console.log(`${new Date().toLocaleTimeString()} built ${path.relative(root, out)} (${(html.length / 1024).toFixed(0)} KB)`);
    });
  },
};
const options = { entryPoints: [path.join(root, "src/main.js")], bundle: true, loader: { ".png": "dataurl", ".webp": "dataurl" }, format: "iife", minify: !dev, target: ["es2020"], write: false, outfile: "game.js", logLevel: "warning", plugins: [writeHtml] };
if (dev) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  for (const f of ["src/index.html", "src/style.css"]) fs.watchFile(path.join(root, f), { interval: 300 }, () => ctx.rebuild());
  const { port } = await ctx.serve({ servedir: path.join(root, "dist"), port: 8001 });
  console.log(`Voxel reference: http://localhost:${port}/`);
} else {
  await esbuild.build(options);
}
