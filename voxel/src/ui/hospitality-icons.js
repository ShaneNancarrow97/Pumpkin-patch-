import atlas from '../../assets/hospitality-icons.webp';
const url=(()=>{try{return URL.createObjectURL(new Blob([Uint8Array.from(atob(atlas.split(',')[1]),c=>c.charCodeAt(0))],{type:'image/webp'}))}catch{return atlas}})();
export const HOSPITALITY_ICONS=['rush','vip','hungry','fleet','route','supply','ghost-wafer','caramel-flake','smores-platter','barista','courier-crate','dispatch'];
export function hospitalityIcon(id,size=56){const i=HOSPITALITY_ICONS.indexOf(id);return i<0?'':`<span aria-hidden="true" style="display:inline-block;flex-shrink:0;width:${size}px;height:${size}px;background-image:url(${url});background-size:400% 300%;background-position:${i%4*100/3}% ${Math.floor(i/4)*50}%"></span>`;}
