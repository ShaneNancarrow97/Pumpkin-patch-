// Check real overlay CSS and input-family changes without starting WebGL.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { build } from "esbuild";
import { villageActionPrompt, villageKeycap } from "../src/ui/village-action-prompt.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.resolve(process.argv[2] ?? "/tmp/village-ui-clarity-qa");
await fs.mkdir(out, { recursive: true });
const buildSource = await fs.readFile(path.join(root, "build.mjs"), "utf8");
const files = [...buildSource.match(/const css = inline\(\[([\s\S]*?)\]\.map/)[1].matchAll(/"([^"]+)"/g)].map(m => m[1]);
let css = (await Promise.all(files.map(file => fs.readFile(path.join(root, file), "utf8")))).join("\n");
for (const rel of new Set([...css.matchAll(/url\('(?<rel>assets\/[^']+)'\)/g)].map(m => m.groups.rel))) {
  const data = await fs.readFile(path.join(root, rel));
  css = css.replaceAll(`url('${rel}')`, `url('data:application/octet-stream;base64,${data.toString("base64")}')`);
}
const bundle = await build({ stdin: { contents: `
  import {createVillageConversation} from './src/ui/village-conversation.js';
  import {createVillageReturnPrompt} from './src/ui/village-return-prompt.js';
  window.chat=createVillageConversation();window.travel=createVillageReturnPrompt();
`, resolveDir: root }, bundle: true, format: "iife", write: false, logLevel: "silent" });
const target = "The Lamplighter’s original moth-marked notebook from the old Moonclock keeper’s forgotten observatory";
const prompt = villageActionPrompt({ type: "expansion-activity", label: "Read", target });
const html = `<style>${css}body{margin:0;background:linear-gradient(145deg,#7d7791,#20192d);height:100dvh}</style>
<section id="village-game" data-input="touch"><header class="vg-heading"><button>Farm</button><div><small>Mothlight Village</small><b id="vg-place">Hollow Green</b></div><span id="vg-coins">£520</span><button>Shane</button><button aria-label="Fullscreen">⛶</button></header>
<nav class="vg-dock">${["Map", "People", "Quests", "Satchel", "Workshop", "Build"].map(name => `<button class="vg-nav-button"><b>${name}</b></button>`).join("")}</nav>
<aside id="vg-panel" hidden><header><button id="vg-panel-back">‹</button><div class="vg-panel-heading"><small id="vg-panel-tag">Mothlight Village</small><h2 id="vg-panel-title">The Lamplighter’s forgotten observatory</h2></div><button id="vg-panel-close">×</button></header><div id="vg-panel-body"><p>The full title stays clear above the page.</p><button>Read the notebook</button></div></aside>
<div class="vg-thumb-zone vg-move-zone"><div class="vg-thumb-disc"><i></i></div></div><div class="vg-thumb-zone vg-look-zone"><div class="vg-thumb-disc"><i></i></div></div>
<button id="vg-interact" class="vg-interact vg-action-button is-ready" aria-label="${prompt.accessible}">${villageKeycap("e")}<span class="vg-action-copy"><strong>${prompt.action}</strong><small>${prompt.target}</small></span></button>
<button class="vg-look">◎</button>
<div class="vg-pad-legend" hidden><span class="vg-legend-primary"><span class="vg-legend-action is-ready">${villageKeycap("cross")}<span class="vg-action-copy"><em>${prompt.action}</em><small>${prompt.target}</small></span></span></span><span class="vg-legend-shortcuts"><span class="vg-legend-control">${villageKeycap("up")}<em>Quest</em></span><span class="vg-legend-control">${villageKeycap("options")}<em>Menus</em></span></span></div></section>`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium", headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const page = await browser.newPage();
const report = { cases: [], glyphs: [], pageErrors: [] };
page.on("pageerror", error => report.pageErrors.push(error.message));
const inside = (r, width, height) => r.x >= -.5 && r.y >= -.5 && r.x + r.width <= width + .5 && r.y + r.height <= height + .5;
const luminance = colour => { const c=colour.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c.reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0); };
const contrast = (ink,surface) => { const a=luminance(ink),b=luminance(surface);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05); };
try {
  for (const [name, width, height, zoom = 1] of [["phone-small",320,740],["phone",390,844],["phone-landscape",844,390],["small-landscape",568,320],["fold-cover",344,882],["fold-open",768,1024],["tv-720",1280,720,1.2],["tv-1080",1920,1080,1.5]]) {
    await page.setViewportSize({ width, height }); await page.setContent(html); await page.addScriptTag({ content: bundle.outputFiles[0].text });
    await page.evaluate(zoom => { document.body.classList.toggle("tv-mode", zoom !== 1); document.documentElement.style.setProperty("--tv-zoom", zoom); }, zoom);
    await page.evaluate(() => document.fonts.ready);
    const action = await page.locator("#vg-interact").evaluate(el => {
      const r = el.getBoundingClientRect(), small = el.querySelector("small"), copy = small.getBoundingClientRect(), cs = getComputedStyle(small);
      const head=document.querySelector(".vg-heading").getBoundingClientRect();return { x:r.x,y:r.y,width:r.width,height:r.height,headerBottom:head.bottom,target:small.textContent,colour:cs.color,background:getComputedStyle(el).backgroundColor,backgroundImage:getComputedStyle(el).backgroundImage,copy:{x:copy.x,y:copy.y,width:copy.width,height:copy.height},overflow:small.scrollWidth > small.clientWidth + 1 || small.scrollHeight > small.clientHeight + 1,clamp:cs.webkitLineClamp,display:cs.display };
    });
    assert.ok(inside(action,width,height),`${name}: action fits the viewport`); assert.ok(action.width >= 44 && action.height >= 44,`${name}: comfortable action target`);
    assert.ok(action.y>=action.headerBottom+4,`${name}: action leaves header controls clear`);
    assert.ok(action.x>=width/2+32||action.x+action.width<=width/2-32||action.y>=height/2+40||action.y+action.height<=height/2-40,`${name}: action leaves the owner's centre space clear`);
    assert.equal(action.target,target); assert.equal(action.overflow,false,`${name}: complete object name wraps`); assert.notEqual(action.display,"none"); assert.equal(action.clamp,"none");
    action.contrast=contrast(action.colour,action.background);assert.equal(action.backgroundImage,"none",`${name}: action uses the checked token surface`);assert.ok(action.contrast>=4.5,`${name}: full object name contrasts with the shipped action fill`);
    const dock=await page.locator(".vg-dock").evaluate(el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,buttons:[...el.querySelectorAll("button")].map(b=>{const q=b.getBoundingClientRect();return{x:q.x,y:q.y,width:q.width,height:q.height,label:b.textContent};})};});
    assert.ok(inside(dock,width,height),`${name}: dock fits`);for(const button of dock.buttons){assert.ok(inside(button,width,height),`${name}: ${button.label} fits`);assert.ok(button.width>=44&&button.height>=44,`${name}: ${button.label} has a full touch target`);}
    await page.screenshot({ path:path.join(out,`${name}-action.png`) });
    await page.evaluate(()=>{document.querySelector("#village-game").dataset.input="keyboard";});
    const keyboardAction=await page.locator("#vg-interact").evaluate(el=>{const r=el.getBoundingClientRect(),small=el.querySelector("small"),head=document.querySelector(".vg-heading").getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,headerBottom:head.bottom,target:small.textContent,overflow:small.scrollWidth>small.clientWidth+1||small.scrollHeight>small.clientHeight+1};});
    assert.ok(inside(keyboardAction,width,height),`${name}: keyboard action fits`);assert.ok(keyboardAction.y>=keyboardAction.headerBottom+4,`${name}: keyboard action leaves header controls clear`);assert.equal(keyboardAction.target,target);assert.equal(keyboardAction.overflow,false);
    await page.evaluate(() => { const root=document.querySelector("#village-game");root.classList.add("vg-input-pad");root.dataset.input="pad";root.querySelector(".vg-pad-legend").hidden=false; });
    const legend = await page.locator(".vg-pad-legend").evaluate(el => { const r=el.getBoundingClientRect(),name=el.querySelector("small");return{x:r.x,y:r.y,width:r.width,height:r.height,target:name.textContent,overflow:name.scrollWidth>name.clientWidth+1||name.scrollHeight>name.clientHeight+1}; });
    assert.ok(inside(legend,width,height),`${name}: pad action fits`);assert.equal(legend.target,target);assert.equal(legend.overflow,false,`${name}: pad target wraps`);
    await page.evaluate(() => { const root=document.querySelector("#village-game");root.classList.add("has-panel");root.querySelector(".vg-pad-legend").hidden=true;document.querySelector("#vg-panel").hidden=false; });
    const title = await page.locator("#vg-panel-title").evaluate(el => { const r=el.getBoundingClientRect(),h=el.closest("header").getBoundingClientRect(),panel=el.closest("aside").getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,header:{x:h.x,y:h.y,width:h.width,height:h.height},panel:{x:panel.x,y:panel.y,width:panel.width,height:panel.height},overflow:el.scrollWidth>el.clientWidth+1||el.scrollHeight>el.clientHeight+1}; });
    assert.ok(inside(title.panel,width,height),`${name}: panel fits`);assert.equal(title.overflow,false);assert.ok(title.y>=title.header.y&&title.y+title.height<=title.header.y+title.header.height+.5,`${name}: title has full header height`);
    await page.screenshot({ path:path.join(out,`${name}-title.png`) }); report.cases.push({name,width,height,zoom,action,keyboardAction,legend,title,dock});
  }
  await page.setViewportSize({width:1280,height:800}); await page.setContent(html); await page.addScriptTag({content:bundle.outputFiles[0].text});
  for (const view of ["chat","chat-choice","travel"]) {
    const instance=view.startsWith("chat")?"chat":"travel";
    await page.evaluate(view => { const root=document.querySelector("#village-game");root.hidden=true;root.dataset.input="keyboard";if(view==="chat-choice")window.chat.open({id:"rowan",name:"Rowan",lines:[{text:"Which path shall we take?",choices:[{id:"path",label:"Follow the lantern path",description:"See what waits beside the old observatory"}]}]});else if(view==="chat")window.chat.open({id:"rowan",name:"Rowan",lines:["The lantern path is ready.","Welcome back."]});else window.travel.open(); },view);
    const button = view==="chat-choice"?".village-reply":view==="chat" ? ".village-dialogue-next" : ".village-return-confirm";
    for (const state of ["default","hover","focus","keyboard-after-pad","keyboard-after-touch"]) {
      if(state==="hover")await page.locator(button).hover();
      if(state==="focus")await page.locator(button).focus();
      if(state.startsWith("keyboard-after-"))await page.evaluate(({instance,state})=>{window[instance].setInput(state.endsWith("pad")?"pad":"touch",{id:"DualSense Wireless Controller"});window[instance].setInput("keyboard");},{instance,state});
      const glyph = await page.locator(`${button} .glyph-keyboard`).evaluate(el => {
        const style=getComputedStyle(el),r=el.getBoundingClientRect(),parent=el.closest("button").getBoundingClientRect();return{text:el.textContent,colour:style.color,background:style.backgroundColor,x:r.x,y:r.y,width:r.width,height:r.height,button:{x:parent.x,y:parent.y,width:parent.width,height:parent.height}};
      });
      glyph.contrast=contrast(glyph.colour,glyph.background);
      assert.equal(glyph.text,"Enter");assert.ok(glyph.contrast>=4.5,`${view}/${state}: Enter contrasts with its own cap`);assert.ok(glyph.x>=glyph.button.x&&glyph.x+glyph.width<=glyph.button.x+glyph.button.width+.5,`${view}/${state}: Enter fits`);report.glyphs.push({view,state,...glyph});
    }
    await page.screenshot({path:path.join(out,`${view}-keyboard.png`)});await page.evaluate(instance=>window[instance].close(),instance);
  }
  assert.deepEqual(report.pageErrors,[]);
  report.passed=true;
} finally {
  await fs.writeFile(path.join(out,"village-ui-clarity-report.json"),JSON.stringify(report,null,2)+"\n");await browser.close();
}
console.log(`Village UI clarity passed ${report.cases.length} viewport cases and ${report.glyphs.length} Enter states: ${out}`);
