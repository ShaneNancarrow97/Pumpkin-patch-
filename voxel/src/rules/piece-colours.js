// Optional finish IDs preserve existing pieces and their original artwork.
export const PIECE_COLOURS = [
  {id:"original",name:"Original",color:0xffffff}, {id:"amber",name:"Amber",color:0xffd7ac},
  {id:"moon",name:"Moon",color:0xcdbfe9}, {id:"sage",name:"Sage",color:0xc2d8af},
];
export const validPieceColour = id => PIECE_COLOURS.some(c=>c.id===id);
export const nextPieceColour = id => PIECE_COLOURS[(Math.max(0,PIECE_COLOURS.findIndex(c=>c.id===id))+1)%PIECE_COLOURS.length].id;
export function setPieceColour(s, domain, instance, colour) {
  if(s.paused||!validPieceColour(colour))return false;
  const list=domain==="garden"?s.estate?.placed:domain==="foyer"?s.hollowHouse?.foyer.placed:domain==="home"?s.house?.placed:null;
  const p=list?.find(p=>p.instance===instance);if(!p)return false;p.tint=colour;return true;
}
