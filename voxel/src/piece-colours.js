import { PIECE_COLOURS } from "./rules/piece-colours.js";
// Each placed model owns its colour treatment; cached decor templates stay intact.
export function applyPieceColour(group, id, cloneMaterials=false) {
  const colour=PIECE_COLOURS.find(c=>c.id===id)?.color??0xffffff;
  if(colour===0xffffff&&cloneMaterials)return;
  group.traverse(m=>{if(!m.isMesh)return;const paint=mat=>{if(mat.isMeshBasicMaterial)return mat;if(cloneMaterials&&!mat.userData.pieceColourOwned){mat=mat.clone();mat.userData.pieceColourOwned=true;}mat.color.setHex(colour);return mat;};m.material=Array.isArray(m.material)?m.material.map(paint):paint(m.material);});
}
