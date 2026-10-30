import { hospitalityIcon } from "./ui/hospitality-icons.js";
// Sandy's dedicated cut-outs preserve the same long adult body in every state.
import * as THREE from "three";
import base from "../assets/sandy/lean-idle.webp";
import blink from "../assets/sandy/lean-blink.webp";
import serve from "../assets/sandy/lean-serve.webp";
import bellURL from "../assets/sandy/service-bell.webp";
import portraitURL from "../assets/sandy/lean-portrait.webp";
import icons from "../assets/sandy/cocoa-menu-icons.webp";
import { LEAN, STRETCH } from "./world.js";
const textures = [base, blink, serve, bellURL].map(url => { const t = new THREE.TextureLoader().load(url); t.colorSpace = THREE.SRGBColorSpace; return t; });
// Sent to the graphics card ahead of her first blink (scene.js warm-up).
export const sandyTextures = textures;
const width=1.8,unit=width/512;
const geometry = new THREE.PlaneGeometry(width,320*unit); geometry.translate(0,(312-160)*unit,0);
export function createSandy() {
  const group = new THREE.Group(), lean = new THREE.Group(); lean.rotation.x = -LEAN + .35; lean.scale.y = STRETCH; group.add(lean);
  const mat = new THREE.MeshStandardMaterial({ map: textures[0], alphaTest: .65, roughness: 1, emissive: 0xffffff, emissiveMap: textures[0], emissiveIntensity: .035, color: 0xd8c9b6 });
  const dog = new THREE.Mesh(geometry, mat); dog.castShadow = true;
  // The same bell stays on the counter between service frames.
  const bellGeo = new THREE.PlaneGeometry(.23,.23*133/190);
  const bell = new THREE.Mesh(bellGeo, new THREE.MeshStandardMaterial({ map: textures[3], alphaTest: .65, roughness: 1, emissive: 0xffffff, emissiveMap: textures[3], emissiveIntensity: .035, color: 0xd8c9b6 }));
  bell.position.set(.55,.10,.002); lean.add(bell);
  dog.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: textures[0], alphaTest: .65 }); lean.add(dog);
  group.userData.sandy = true;
  return { group, get ready() { return textures.every(t => t.image?.complete); }, tick(time, level, serving) {
    const frame = serving ? (Math.floor(time * 3) % 2 ? 2 : 0) : time % 4.8 > 4.55 ? 1 : 0;
    if (mat.map !== textures[frame]) { mat.map = mat.emissiveMap = dog.customDepthMaterial.map = textures[frame]; }
    lean.scale.y = STRETCH * (1 + Math.sin(time * 2) * .003); group.userData.frame = frame; group.userData.tier = level;
  } };
}
export function cocoaArt(id = "sandy") {
  const extra= hospitalityIcon(id); if(extra)return extra;
  if (id === "sandy") return `<span class="thumb"><img src="${portraitURL}" alt="Sandy"></span>`;
  const [col, row] = { cocoa: [0, 0], flake: [1, 0], deluxe: [2, 0], midnight: [0, 1], smores: [1, 1], shop: [2, 1] }[id] ?? [0, 0];
  return `<span class="thumb"><span class="cocoa-art" style="background-image:url('${icons}');background-position:${col * 50}% ${row * 100}%" aria-hidden="true"></span></span>`;
}
