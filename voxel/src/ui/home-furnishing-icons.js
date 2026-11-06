import atlas from "../../assets/home-furnishings/furnishings.webp";
import { HOME_FURNISHINGS } from "../content/home-furnishings.js";
import { PET_FURNISHINGS } from "../content/pet-furnishings.js";
const ids=[...HOME_FURNISHINGS,...PET_FURNISHINGS].map(item=>item.id),cols=4,rows=Math.ceil(ids.length/cols);
// Use a single shared URL so live menus do not duplicate embedded art strings.
const url=(()=>{try{if(!atlas.startsWith("data:"))return atlas;return URL.createObjectURL(new Blob([Uint8Array.from(atob(atlas.split(",")[1]),c=>c.charCodeAt(0))],{type:"image/webp"}));}catch{return atlas;}})();
export function homeFurnishingIcon(id,size=52){
  const index=ids.indexOf(id);if(index<0)return "";
  return `<span class="thumb"><span aria-hidden="true" style="display:block;width:${size}px;height:${size}px;background:url(${url}) ${index%cols*100/(cols-1)}% ${Math.floor(index/cols)*100/(rows-1)}% / ${cols*100}% ${rows*100}% no-repeat"></span></span>`;
}
