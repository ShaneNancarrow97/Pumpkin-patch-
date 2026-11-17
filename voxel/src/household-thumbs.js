import atlas from "../assets/household-thumbs.webp";
import { HOUSEHOLD_CATALOG } from "./content/household-catalog.js";

// 144px cells rendered directly from household-props.js. The runtime scales the
// high-quality atlas down for small catalogue cells and larger item previews.
const columns=6,rows=Math.ceil(HOUSEHOLD_CATALOG.length/columns);
const cells=Object.freeze(Object.fromEntries(HOUSEHOLD_CATALOG.map((item,index)=>[item.id,index])));
const url=(()=>{try{
  if(!atlas.startsWith("data:"))return atlas;
  return URL.createObjectURL(new Blob([Uint8Array.from(atob(atlas.split(",")[1]),c=>c.charCodeAt(0))],{type:"image/webp"}));
}catch{return atlas;}})();
export function householdIcon(id,size=52){
  const cell=cells[id];if(cell===undefined)return null;
  return `<span class="thumb" style="--thumb:${size}px"><span aria-hidden="true" style="display:block;flex:none;width:${size}px;height:${size}px;background-image:url('${url}');background-position:-${cell%columns*size}px -${Math.floor(cell/columns)*size}px;background-size:${columns*size}px ${rows*size}px;background-repeat:no-repeat"></span></span>`;
}
