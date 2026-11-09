// A quiet world-space invitation above an actual, unlocked village shop.
// The shared painted UI atlas is sampled once; no asset import or new light.
import * as THREE from 'three';
import { FIXTURES, PLAN_SCALE } from './content/village.js';
import { stallOpen } from './rules/village.js';
import { VILLAGE_UI_GRID, VILLAGE_UI_ICONS } from './content/village-ui-icon-meta.js';

export const VILLAGE_SHOP_MARKER_LIMIT = 1;
export const SHOP_MARKER_HEIGHT = 3.62 * PLAN_SCALE + .85;
export const SHOP_MARKER_REACH = 60;
const SIZE = 256, TURN = .12, TAU = Math.PI * 2;

function atlasFromStyle(doc) {
  if (!doc?.documentElement) return '';
  const style = doc.defaultView?.getComputedStyle?.(doc.documentElement);
  const value = style?.getPropertyValue('--village-ui-atlas')?.trim() ?? '';
  const match = /^url\((['"]?)(.*?)\1\)$/s.exec(value);
  return match?.[2] ?? '';
}
function fallbackTexture() {
  const side=32,bytes=new Uint8Array(side*side*4);
  for(let y=0;y<side;y++)for(let x=0;x<side;x++){
    const d=Math.hypot(x-15.5,y-15.5),i=(y*side+x)*4;
    bytes[i]=d>13?222:47;bytes[i+1]=d>13?181:31;bytes[i+2]=d>13?121:59;bytes[i+3]=d<15?190:0;
  }
  const texture=new THREE.DataTexture(bytes,side,side);texture.needsUpdate=true;texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
function paintBadge(canvas, image) {
  const c=canvas?.getContext?.('2d');if(!c)return false;
  c.clearRect(0,0,SIZE,SIZE);
  const fill=c.createRadialGradient(105,90,12,128,128,116);
  fill.addColorStop(0,'rgba(82,54,96,.88)');fill.addColorStop(1,'rgba(30,21,42,.62)');
  c.beginPath();c.arc(128,128,111,0,TAU);c.fillStyle=fill;c.fill();
  c.strokeStyle='rgba(246,207,148,.75)';c.lineWidth=3;c.stroke();
  c.beginPath();c.arc(128,128,103,0,TAU);c.strokeStyle='rgba(255,238,206,.17)';c.lineWidth=1;c.stroke();
  if(image){const art=VILLAGE_UI_ICONS.workshop,cell=VILLAGE_UI_GRID.cell;c.drawImage(image,art.column*cell,art.row*cell,cell,cell,39,37,178,178);}
  else {
    // A simple basket remains useful if an embedded atlas cannot be decoded.
    c.strokeStyle='#f0d1a1';c.lineWidth=8;c.lineJoin='round';c.lineCap='round';
    c.beginPath();c.moveTo(76,112);c.lineTo(88,167);c.lineTo(168,167);c.lineTo(180,112);c.closePath();c.stroke();
    c.beginPath();c.moveTo(101,112);c.lineTo(116,83);c.moveTo(155,112);c.lineTo(140,83);c.moveTo(118,125);c.lineTo(118,153);c.moveTo(142,125);c.lineTo(142,153);c.stroke();
  }
  return true;
}
function paintRim(canvas) {
  const c=canvas?.getContext?.('2d');if(!c)return;
  c.clearRect(0,0,SIZE,SIZE);c.strokeStyle='rgba(242,195,124,.9)';c.lineWidth=2;
  for(let i=0;i<8;i++){c.beginPath();c.arc(128,128,116,i/8*TAU+.055,(i+.62)/8*TAU);c.stroke();}
  for(let i=0;i<4;i++){const a=i/4*TAU,x=128+Math.cos(a)*116,y=128+Math.sin(a)*116;c.fillStyle='rgba(255,230,181,.9)';c.beginPath();c.arc(x,y,2.8,0,TAU);c.fill();}
}

export function createVillageShopMarkers({ groundAt=()=>0, iconURL, document:doc=globalThis.document, canvasFactory=()=>doc?.createElement?.('canvas'), imageFactory=()=>typeof Image==='function'?new Image():null, textureFactory=canvas=>canvas?new THREE.CanvasTexture(canvas):fallbackTexture() }={}) {
  const makeCanvas=()=>{const c=canvasFactory();if(c)c.width=c.height=SIZE;return c;};
  const faceCanvas=makeCanvas(),rimCanvas=makeCanvas();paintBadge(faceCanvas);paintRim(rimCanvas);
  const faceTexture=textureFactory(faceCanvas),rimTexture=textureFactory(rimCanvas);
  for(const t of [faceTexture,rimTexture]){t.colorSpace=THREE.SRGBColorSpace;t.minFilter=THREE.LinearFilter;t.magFilter=THREE.LinearFilter;t.generateMipmaps=false;t.needsUpdate=true;}
  const material=new THREE.SpriteMaterial({map:faceTexture,transparent:true,opacity:.86,depthWrite:false,depthTest:true,toneMapped:false,fog:true});
  const rimMaterial=new THREE.SpriteMaterial({map:rimTexture,transparent:true,opacity:.46,depthWrite:false,depthTest:true,toneMapped:false,fog:true});
  const badge=new THREE.Sprite(material),rim=new THREE.Sprite(rimMaterial),group=new THREE.Group();
  group.name='Village shop marker';badge.name='Rowan shop emblem';rim.name='Shop emblem rim';
  badge.scale.set(1.3,1.3,1);rim.scale.set(1.43,1.43,1);badge.renderOrder=4;rim.renderOrder=3;
  badge.userData={type:'village-stall',id:'rowan-stall',shopMarker:true};rim.raycast=()=>{};group.add(rim,badge);
  const point=FIXTURES.stall;let baseY=SHOP_MARKER_HEIGHT,open=false,disposed=false,time=0,iconLoaded=false,iconFailed=false;
  group.position.set(point.x,baseY,-point.z);group.visible=badge.visible=rim.visible=false;
  // This is the only layout/style read in the marker's lifetime.
  const source=typeof iconURL==='function'?iconURL():iconURL??atlasFromStyle(doc),image=source?imageFactory():null;
  if(image){
    image.onload=()=>{if(disposed)return;if(paintBadge(faceCanvas,image)){faceTexture.needsUpdate=true;iconLoaded=true;}image.onload=image.onerror=null;};
    image.onerror=()=>{if(disposed)return;iconFailed=true;image.onload=image.onerror=null;};image.src=source;
  }
  return {
    group,pickables:[badge],
    sync(state){if(disposed)return;open=!!state?.village&&stallOpen(state);const y=groundAt(point.x,point.z);baseY=(Number.isFinite(y)?y:0)+SHOP_MARKER_HEIGHT;group.position.set(point.x,baseY,-point.z);if(!open)group.visible=badge.visible=rim.visible=false;},
    tick(dt,camera,visible=true,reducedMotion=false){
      if(disposed)return;time+=Math.max(0,Math.min(.1,Number(dt)||0));
      const p=camera?.position??camera,near=!p||((p.x-point.x)**2+(p.z+point.z)**2<=SHOP_MARKER_REACH**2);
      const shown=open&&!!visible&&near;group.visible=badge.visible=rim.visible=shown;
      if(!shown)return;
      group.position.y=baseY+(reducedMotion?0:Math.sin(time*.9)*.07);
      material.rotation=0;rimMaterial.rotation=reducedMotion?0:(time*TURN)%TAU;rimMaterial.opacity=reducedMotion ? .46 : .46+Math.sin(time*.6)*.055;
    },
    hide(){group.visible=badge.visible=rim.visible=false;},
    dispose(){if(disposed)return;disposed=true;open=false;group.visible=badge.visible=rim.visible=false;if(image)image.onload=image.onerror=null;group.remove(badge,rim);faceTexture.dispose();rimTexture.dispose();material.dispose();rimMaterial.dispose();},
    get stats(){return{limit:VILLAGE_SHOP_MARKER_LIMIT,count:open?1:0,visible:group.visible,iconLoaded,iconFailed,addedLights:0,disposed,rotation:rimMaterial.rotation};},
  };
}
