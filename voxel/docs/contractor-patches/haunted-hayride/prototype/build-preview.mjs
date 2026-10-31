import { writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url)), args = process.argv.slice(2);
const depsIndex = args.indexOf("--deps"), outIndex = args.indexOf("--out");
const deps = depsIndex >= 0 ? resolve(args[depsIndex + 1]) : null;
const esbuild = deps ? await import(pathToFileURL(resolve(deps, "esbuild/lib/main.js"))) : await import("esbuild");
const out = outIndex >= 0 ? resolve(args[outIndex + 1]) : resolve(here, "convoy-preview.html");
const result = await esbuild.build({ entryPoints: [resolve(here, "preview.js")], bundle: true, minify: true, write: false,
  format: "iife", target: "es2020", nodePaths: deps ? [deps] : [],
});
const script = result.outputFiles[0].text.replaceAll("</script", "<\\/script");
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Hollow Hayride — native voxel prototype</title><style>
*{box-sizing:border-box}body{margin:0;background:#181220;color:#f4e5ce;font:14px system-ui,sans-serif;height:100dvh;overflow:hidden}header{position:fixed;z-index:2;top:16px;left:16px;pointer-events:none}h1{margin:0;font-size:20px}p{margin:5px 0;color:#c7b8ce;font-size:12px}main{width:100%;height:100%;touch-action:none}canvas{display:block}nav{position:fixed;z-index:3;bottom:max(12px,env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);display:flex;gap:5px;padding:6px;background:#211a2be8;border:1px solid #736149;border-radius:18px;max-width:calc(100% - 16px);flex-wrap:wrap;justify-content:center;width:max-content}button{min-height:44px;border:0;border-radius:12px;color:#f4e5ce;background:#493749;padding:0 12px;cursor:pointer}button:hover,button:focus-visible{background:#73502e;outline:2px solid #bd9255}footer{position:fixed;right:16px;top:16px;font-size:12px;color:#c7b8ce;pointer-events:none}@media(max-width:600px){footer{top:70px;left:16px}h1{font-size:17px}button{padding:0 8px;font-size:12px}}
</style><header><h1>The Hollow Hayride</h1><p>Native voxel tractor &amp; four-seat wagon · design prototype</p></header><footer>Drag to orbit · pinch to zoom · no game save access</footer><main></main><nav aria-label="Prototype views"><button data-view="rear">Rear boarding</button><button data-view="front">Tractor front</button><button data-view="side">Side</button><button data-view="ride">Ride seat</button><button id="gate">Close gate</button><button id="roll">Roll wheels</button></nav><script>${script}</script></html>`;
await writeFile(out, html); console.log(out);
