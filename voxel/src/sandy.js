import { hospitalityIcon } from "./ui/hospitality-icons.js";
// Sandy's dedicated cut-outs preserve the same long adult body in every state.
import * as THREE from "three";
import base from "../assets/sandy/sandy-base.webp";
import blink from "../assets/sandy/sandy-blink.webp";
import serve from "../assets/sandy/sandy-serve.webp";
import icons from "../assets/sandy/cocoa-menu-icons.webp";
import { LEAN, STRETCH } from "./world.js";
const textures = [base, blink, serve].map(url => { const t = new THREE.TextureLoader().load(url); t.colorSpace = THREE.SRGBColorSpace; return t; });
// Sent to the graphics card ahead of her first blink (scene.js warm-up).
export const sandyTextures = textures;
const geometry = new THREE.PlaneGeometry(2.6, 2.6 * 1024 / 1536); geometry.translate(0, (.97 - .5) * 2.6 * 1024 / 1536, 0);
export function createSandy() {
  const group = new THREE.Group(), lean = new THREE.Group(); lean.rotation.x = -LEAN + .35; lean.scale.y = STRETCH; group.add(lean);
  const mat = new THREE.MeshStandardMaterial({ map: textures[0], alphaTest: .65, roughness: 1, emissive: 0xffffff, emissiveMap: textures[0], emissiveIntensity: .035, color: 0xd8c9b6 });
  const dog = new THREE.Mesh(geometry, mat); dog.castShadow = true;
  // The same bell stays on the counter between service frames.
  const bellGeo = new THREE.PlaneGeometry(190 / 1536 * 2.6, 133 / 1024 * 2.6 * 1024 / 1536);
  const uv = bellGeo.attributes.uv;
  for (let i=0;i<uv.count;i++) uv.setXY(i,(135+uv.getX(i)*190)/1536,1-(810+(1-uv.getY(i))*133)/1024);
  const bell = new THREE.Mesh(bellGeo, new THREE.MeshStandardMaterial({ map: textures[2], alphaTest: .65, roughness: 1, emissive: 0xffffff, emissiveMap: textures[2], emissiveIntensity: .035, color: 0xd8c9b6 }));
  bell.position.set((230/1536-.5)*2.6,(.97-876.5/1024)*2.6*1024/1536,.002); lean.add(bell);
  dog.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: textures[0], alphaTest: .65 }); lean.add(dog);
  group.userData.sandy = true;
  return { group, get ready() { return textures.every(t => t.image?.complete); }, tick(time, level, serving) {
    const frame = serving ? (Math.floor(time * 3) % 2 ? 2 : 0) : time % 4.8 > 4.55 ? 1 : 0;
    if (mat.map !== textures[frame]) { mat.map = mat.emissiveMap = dog.customDepthMaterial.map = textures[frame]; }
    bell.visible = frame !== 2;
    lean.scale.y = STRETCH * (1 + Math.sin(time * 2) * .003); group.userData.frame = frame; group.userData.tier = level;
  } };
}
export function cocoaArt(id = "sandy") {
  const extra= hospitalityIcon(id); if(extra)return extra;
  if (id === "sandy") return `<span class="thumb"><span class="sandy-portrait" style="background-image:url('${base}')" aria-hidden="true"></span></span>`;
  const [col, row] = { cocoa: [0, 0], flake: [1, 0], deluxe: [2, 0], midnight: [0, 1], smores: [1, 1], shop: [2, 1] }[id] ?? [0, 0];
  return `<span class="thumb"><span class="cocoa-art" style="background-image:url('${icons}');background-position:${col * 50}% ${row * 100}%" aria-hidden="true"></span></span>`;
}
