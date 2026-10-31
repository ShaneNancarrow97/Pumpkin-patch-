// Button glyphs: what each control shows for each kind of input, as a keycap,
// DualSense shapes or Xbox letters; touch shows none. Play mode, the carving
// bench and the controller menus (ui/pad-menu.js) all draw from here.
export const GLYPHS={action:{keyboard:'E',dualsense:'square',xbox:'A'},tools:{keyboard:'Q',dualsense:'triangle',xbox:'Y'},gait:{keyboard:'Shift',dualsense:'L3',xbox:'LS'},recenter:{keyboard:'C',dualsense:'R3',xbox:'RS'},back:{keyboard:'Esc',dualsense:'circle',xbox:'B'},confirm:{keyboard:'E',dualsense:'cross',xbox:'A'},
  lb:{keyboard:'Q',dualsense:'L1',xbox:'LB'},rb:{keyboard:'R',dualsense:'R1',xbox:'RB'},lt:{keyboard:'[',dualsense:'L2',xbox:'LT'},rt:{keyboard:']',dualsense:'R2',xbox:'RT'},start:{keyboard:'Enter',dualsense:'options',xbox:'menu'},dpad:{keyboard:'Tab',dualsense:'dpad',xbox:'dpad'},lstick:{keyboard:'WASD',dualsense:'L',xbox:'L'},rstick:{keyboard:'IJKL',dualsense:'R',xbox:'R'},view:{keyboard:'C',dualsense:'triangle',xbox:'Y'}};
const SHAPES={cross:'<path d="M7 7l10 10M17 7 7 17"/>',circle:'<circle cx="12" cy="12" r="5.5"/>',square:'<rect x="6.5" y="6.5" width="11" height="11" rx="1"/>',triangle:'<path d="M12 6 18 17H6Z"/>',dpad:'<path d="M9.5 4h5v5.5H20v5h-5.5V20h-5v-5.5H4v-5h5.5z"/>',options:'<path d="M7 8h10M7 12h10M7 16h10"/>',menu:'<path d="M7 8h10M7 12h10M7 16h10"/>'};
export function glyphHTML(id,mode){
  const g=GLYPHS[id]?.[mode];if(!g)return'';
  if(SHAPES[g])return`<i class="glyph glyph-ps glyph-${g}" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${SHAPES[g]}</svg></i>`;
  if(g==='Shift')return`<i class="glyph glyph-keyboard" aria-hidden="true"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M12 4 4 13h4.5v6h7v-6H20Z"/></svg></i>`;
  return`<i class="glyph glyph-${mode}${mode==='xbox'?' glyph-xbox-'+g.toLowerCase():''}" aria-hidden="true">${g}</i>`;
}
// A connected pad's family, from its id: DualSense (and DualShock) or anything else.
// Sony's vendor id (054c) is in Chrome's and Firefox's ids; an Xbox pad is a "Wireless Controller" too.
export const padFamily=pad=>pad?(!/xbox/i.test(pad.id)&&/dualsense|dualshock|054c|playstation|ps5|ps4|^wireless controller/i.test(pad.id)?'DualSense':'Controller'):'';
