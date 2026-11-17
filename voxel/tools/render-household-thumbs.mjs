// Rebuild with: node tools/render-household-thumbs.mjs
// The icons are renders of the shipped native models, not an unrelated art set.
import { build } from "esbuild";
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const output=path.join(root,"assets/household-thumbs.webp");
const source=`
import * as THREE from "three";
import { householdProp } from "./src/household-props.js";
import { HOUSEHOLD_CATALOG } from "./src/content/household-catalog.js";
window.renderHouseholdAtlas=()=>{
  const tile=144,cols=6,rows=Math.ceil(HOUSEHOLD_CATALOG.length/cols);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
  renderer.setSize(tile,tile);renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;
  const atlas=document.createElement("canvas");atlas.width=cols*tile;atlas.height=rows*tile;
  const ctx=atlas.getContext("2d"),scene=new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xe0dafb,0x5b4359,2.5));
  const key=new THREE.DirectionalLight(0xffe1af,3.5);key.position.set(-3,6,5);scene.add(key);
  const fill=new THREE.DirectionalLight(0xc6bcec,1.4);fill.position.set(4,2,-3);scene.add(fill);
  const camera=new THREE.OrthographicCamera(-1,1,1,-1,.01,100);
  HOUSEHOLD_CATALOG.forEach((item,i)=>{
    const prop=householdProp(item.id,{piece:{media:{on:true,channel:0}}});prop.userData.tick?.(.8);
    scene.add(prop);prop.updateMatrixWorld(true);
    const box=new THREE.Box3().setFromObject(prop),centre=box.getCenter(new THREE.Vector3());
    camera.position.copy(centre).add(new THREE.Vector3(3.5,3.2,5));camera.lookAt(centre);
    camera.updateMatrixWorld(true);
    const inv=camera.matrixWorldInverse,projected=new THREE.Box3();
    for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])projected.expandByPoint(new THREE.Vector3(x,y,z).applyMatrix4(inv));
    const span=Math.max(projected.max.x-projected.min.x,projected.max.y-projected.min.y)*1.12;
    const cx=(projected.min.x+projected.max.x)/2,cy=(projected.min.y+projected.max.y)/2;
    camera.left=cx-span/2;camera.right=cx+span/2;camera.bottom=cy-span/2;camera.top=cy+span/2;camera.updateProjectionMatrix();
    renderer.render(scene,camera);ctx.drawImage(renderer.domElement,(i%cols)*tile,Math.floor(i/cols)*tile);scene.remove(prop);
  });
  renderer.dispose();return atlas.toDataURL("image/webp",.93);
};`;
const {outputFiles}=await build({stdin:{contents:source,resolveDir:root,loader:"js"},bundle:true,format:"iife",write:false,logLevel:"silent"});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??"/usr/bin/chromium",headless:true,args:["--no-sandbox","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
try{
  const page=await browser.newPage();
  await page.setContent("<!doctype html><title>Household native model icons</title>");
  await page.addScriptTag({content:outputFiles[0].text});
  const data=await page.evaluate(()=>window.renderHouseholdAtlas());
  await mkdir(path.dirname(output),{recursive:true});await writeFile(output,Buffer.from(data.split(",")[1],"base64"));
  console.log(`Rendered 36 native household icons to ${path.relative(root,output)}`);
}finally{await browser.close();}
