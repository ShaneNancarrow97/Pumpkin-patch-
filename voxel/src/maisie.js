// Maisie's own terrier pose sheet: aligned feet and one texture for every gait.
import * as THREE from "three";
import url from "../assets/maisie.webp";
import { MAISIE_META as META } from "./maisie-meta.js";
import { LEAN, STRETCH } from "./world.js";

const texture = new THREE.TextureLoader().load(url);
texture.colorSpace = THREE.SRGBColorSpace;
export const maisieTextures = [texture];
const geometry = META.frames.map(f => {
  const u = META.standingWidth / f.w, g = new THREE.PlaneGeometry(f.w * u, f.h * u);
  g.translate((f.w / 2 - f.ax) * u, (f.ay - f.h / 2) * u, 0);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (f.x + uv.getX(i) * f.w) / META.width, 1 - (f.y + (1 - uv.getY(i)) * f.h) / META.height);
  return g;
});
export function createMaisie() {
  const group = new THREE.Group(), lean = new THREE.Group();
  lean.rotation.x = -LEAN + .35; lean.scale.y = STRETCH; group.add(lean);
  const mat = new THREE.MeshStandardMaterial({ map: texture, alphaTest: .35, roughness: 1, color: 0xe1d6c7, emissive: 0xffffff, emissiveMap: texture, emissiveIntensity: .07, side: THREE.DoubleSide });
  const dog = new THREE.Mesh(geometry[0], mat); dog.castShadow = true;
  dog.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: texture, alphaTest: .35 });
  lean.add(dog); group.name = "Maisie · Glen of Imaal terrier";
  group.userData.maisie = true;
  group.userData.dispose = () => { mat.dispose(); dog.customDepthMaterial.dispose(); };
  return { group, get ready() { return !!texture.image?.complete; }, tick(time, moving = false, dx = 1) {
    const frame = moving ? META.walk[Math.floor(Math.max(0, time) * 6) % META.walk.length] : time % 5.2 > 4.95 ? 1 : 0;
    dog.geometry = geometry[frame];
    if (moving && Math.abs(dx) > .2) lean.scale.x = dx < 0 ? -1 : 1;
    lean.scale.y = STRETCH * (1 + Math.sin(time * 2.4) * .003);
    group.userData.frame = frame;
  } };
}
export function maisieIcon() {
  return "<span class=\"maisie-art\" aria-hidden=\"true\" style=\"background-image:url('" + url + "')\"></span>";
}
