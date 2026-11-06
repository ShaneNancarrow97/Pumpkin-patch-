// Run from voxel/: node tools/render-home-furnishing-thumbs.mjs [preview.png].
// Loopback also works in managed browsers that disallow direct file navigation.
import fs from "node:fs";import os from "node:os";import path from "node:path";import http from "node:http";
import {fileURLToPath} from "node:url";import * as esbuild from "esbuild";import {chromium} from "playwright";
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),".."),out=path.join(root,"assets/home-furnishings"),tmp=fs.mkdtempSync(path.join(os.tmpdir(),"home-thumbs-"));
let browser,server;
try{
  await esbuild.build({entryPoints:[path.join(root,"tools/home-furnishing-thumbs.page.js")],bundle:true,outfile:path.join(tmp,"page.js"),format:"iife",target:["es2020"],loader:{".png":"dataurl",".webp":"dataurl"},logLevel:"warning"});
  const bundle=fs.readFileSync(path.join(tmp,"page.js"));
  server=http.createServer((req,res)=>{res.setHeader("Content-Type",req.url==="/page.js"?"text/javascript":"text/html");res.end(req.url==="/page.js"?bundle:'<!doctype html><meta charset="utf-8"><script src="/page.js"></script>');});
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||"/usr/bin/chromium",args:["--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"]});
  const page=await browser.newPage(),errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto("http://127.0.0.1:"+server.address().port);
  await page.waitForFunction(()=>window.homeThumbResult||window.homeThumbError,null,{timeout:120000});
  const {result,error}=await page.evaluate(()=>({result:window.homeThumbResult,error:window.homeThumbError}));
  if(error||errors.length)throw new Error(error||errors.join("\n"));
  fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,"furnishings.webp"),Buffer.from(result.sheet.split(",")[1],"base64"));
  fs.writeFileSync(path.join(out,"manifest.json"),JSON.stringify({generatedBy:"voxel/tools/render-home-furnishing-thumbs.mjs",...result.layout,models:result.stats},null,2)+"\n");
  if(process.argv[2])fs.writeFileSync(process.argv[2],Buffer.from(result.png.split(",")[1],"base64"));
  console.log("Rendered "+result.layout.ids.length+" home furnishing icons.");
}finally{if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));fs.rmSync(tmp,{recursive:true,force:true});}
