// Rebuilds a source tree (src/ + assets/) from a shipped single-file Pumpkin
// Patch build. See docs/SOURCE-RECOVERY.md.
//
//   npm i --no-save acorn eslint-scope@8
//   node tools/recover-source.mjs <Pumpkin_Patch.html or apk assets/index.html> <outDir>
//
// Then compare <outDir> with this repository, copy it over, and run
// npm run check.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import * as acorn from "acorn";
import * as eslintScope from "eslint-scope";

const [, , htmlPath, outDir] = process.argv;
const H = fs.readFileSync(htmlPath, "utf8");
const write = (rel, data) => {
  const p = path.join(outDir, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, data);
};
const sha = (b) => crypto.createHash("sha1").update(b).digest("hex");

// ---- assets ---------------------------------------------------------------
const mapMatch = H.match(/<script>globalThis\.PumpkinPatchAssets=(\{.*?\});\n/);
const assetMap = JSON.parse(mapMatch[1]);
const byHash = new Map();
for (const [p, uri] of Object.entries(assetMap)) {
  const bytes = Buffer.from(uri.slice(uri.indexOf(",") + 1), "base64");
  byHash.set(sha(bytes), p);
  write(p, bytes);
}
// Inline-only media (no path in the asset map), named by what they are.
const extraNames = {
  "image/svg+xml:562": "assets/ui/logo.svg",
  "image/svg+xml:527": "assets/house/sprout.svg",
  "image/webp:210846": "assets/house/character-atlas.webp",
  "audio/mpeg:913444": "assets/audio/moonlit-waltz.mp3",
  "font/woff:112572": "assets/fonts/dm-sans.woff",
};
const unknown = [];
const pathForDataUri = (mime, b64) => {
  const bytes = Buffer.from(b64, "base64");
  const h = sha(bytes);
  if (byHash.has(h)) return byHash.get(h);
  let name = extraNames[mime + ":" + bytes.length];
  if (!name) {
    // Unrecognised inline media: keep it under a stable name and report it.
    name = `assets/inline/${h.slice(0, 10)}.${mime.split("/")[1].replace("svg+xml", "svg").replace("mpeg", "mp3")}`;
    unknown.push(`${mime} ${bytes.length} bytes -> ${name}`);
  }
  byHash.set(h, name);
  write(name, bytes);
  return name;
};
const DATA_RE = /data:([a-z/+]+);base64,([A-Za-z0-9+/=]+)/g;
const dePath = (text) => text.replace(DATA_RE, (m, mime, b64) => pathForDataUri(mime, b64) ?? m);

// ---- split html -----------------------------------------------------------
const styleStart = H.indexOf("<style>"), styleEnd = H.indexOf("</style>");
const css = H.slice(styleStart + 7, styleEnd);
const scriptStart = mapMatch.index;
const bundleStart = scriptStart + mapMatch[0].length;
const bundleEnd = H.lastIndexOf("</script>");
const js = H.slice(bundleStart, bundleEnd);
const template =
  dePath(H.slice(0, styleStart)).replace('<script src="android-shell.js"></script>', "") +
  "<style>/* @build:style */</style>" +
  dePath(H.slice(styleEnd + 8, scriptStart)) +
  "<script>/* @build:assets */</script>\n<script>/* @build:script */</script>" +
  H.slice(bundleEnd + 9);
write("src/index.html", template);
write("src/styles/game.css", dePath(css).replace(/\}(?=[^\n])/g, "}\n"));

// ---- split modules --------------------------------------------------------
const comments = [];
const ast = acorn.parse(js, {
  ecmaVersion: "latest", sourceType: "script",
  onComment: (block, text, start) => { if (!block && /^ src\//.test(text)) comments.push({ file: text.trim(), start }); },
});
const iife = ast.body.find((s) => s.type === "VariableDeclaration").declarations[0].init.callee.body.body;
const templateRanges = [];
(function walk(node) {
  if (!node || typeof node.type !== "string") return;
  if (node.type === "TemplateLiteral") templateRanges.push([node.start, node.end]);
  for (const k in node) {
    const v = node[k];
    if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === "object" && v.type) walk(v);
  }
})(ast);
const inTemplate = (pos) => templateRanges.some(([a, b]) => pos > a && pos < b);

// Dedent by the IIFE's two spaces, never touching template literal contents.
const sliceDedented = (start, end) => {
  let out = "", i = start;
  while (i < end) {
    let nl = js.indexOf("\n", i);
    if (nl < 0 || nl >= end) nl = end;
    out += js.slice(i, nl + (nl < end ? 1 : 0));
    i = nl + 1;
    if (i < end && !inTemplate(i) && js.startsWith("  ", i)) i += 2;
  }
  return out;
};

const order = [];
const modules = new Map();
for (const stmt of iife) {
  const c = [...comments].reverse().find((x) => x.start < stmt.start);
  if (!c) continue; // esbuild runtime helpers
  const src = js.slice(stmt.start, stmt.end);
  if (stmt.type === "ReturnStatement" || /^var main_exports\b|^__export\(main_exports/.test(src)) continue;
  const file = c.file.replace(/\.ts$/, ".js");
  if (!modules.has(file)) { modules.set(file, []); order.push(file); }
  // Keep blank lines between statements as the bundle had them.
  modules.get(file).push(sliceDedented(stmt.start, stmt.end));
}

// Inline media in JS becomes asset paths resolved through asset().
const texts = new Map();
for (const file of order) {
  let t = modules.get(file).join("\n");
  t = t.replace(/'<img class="sprout-image" src="(data:[^"]+)" alt="">'/g, (m, uri) => {
    const [, mime, b64] = uri.match(/data:([a-z/+]+);base64,(.*)/);
    return `'<img class="sprout-image" src="' + asset("${pathForDataUri(mime, b64)}") + '" alt="">'`;
  });
  t = t.replace(DATA_RE, (m, mime, b64) => pathForDataUri(mime, b64) ?? m);
  texts.set(file, t);
}

// Scope analysis: declared top-level names and unresolved references.
const info = new Map();
const owner = new Map();
for (const file of order) {
  const tree = acorn.parse(texts.get(file), { ecmaVersion: "latest", sourceType: "module", ranges: true });
  const sm = eslintScope.analyze(tree, { ecmaVersion: 2022, sourceType: "module" });
  const moduleScope = sm.globalScope.childScopes[0];
  const declared = moduleScope.variables.map((v) => v.name);
  for (const n of declared) {
    if (owner.has(n)) throw new Error(`duplicate top-level ${n} in ${file} and ${owner.get(n)}`);
    owner.set(n, file);
  }
  info.set(file, { declared, through: sm.globalScope.through });
}
const exportsOf = new Map(order.map((f) => [f, new Set()]));
const importsOf = new Map(order.map((f) => [f, new Map()]));
for (const file of order) {
  for (const ref of info.get(file).through) {
    const name = ref.identifier.name, from = owner.get(name);
    if (!from || from === file) continue;
    if (ref.isWrite()) console.warn(`WRITE to imported ${name} in ${file}`);
    exportsOf.get(from).add(name);
    const m = importsOf.get(file);
    if (!m.has(from)) m.set(from, new Set());
    m.get(from).add(name);
  }
}
exportsOf.get("src/main.js").add("app");

for (const file of order) {
  const rel = (to) => {
    let r = path.posix.relative(path.posix.dirname(file), to);
    return r.startsWith(".") ? r : "./" + r;
  };
  const imports = [...importsOf.get(file)]
    .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
    .map(([from, names]) => `import { ${[...names].sort().join(", ")} } from "${rel(from)}";`);
  const exps = [...exportsOf.get(file)].sort();
  let out = (imports.length ? imports.join("\n") + "\n\n" : "") + texts.get(file).trimEnd() + "\n";
  if (exps.length) out += `\nexport { ${exps.join(", ")} };\n`;
  write(file, out);
}
console.log("modules", order.length, "assets", byHash.size, "unknown media", unknown);
