import ingredients from "../../assets/kitchen-ingredients.webp";
import dishes from "../../assets/kitchen-dishes.webp";
import expansionDishes from "../../assets/mothlight-expansion/dishes.webp";
const blob = data => {
  try { if(!data.startsWith("data:"))return data; return URL.createObjectURL(new Blob([Uint8Array.from(atob(data.split(",")[1]), c => c.charCodeAt(0))], {type:"image/webp"})); } catch {return data;}
};
const ingredientURL=blob(ingredients),dishURL=blob(dishes);
const expansionDishURL=blob(expansionDishes);
export const INGREDIENT_ART_IDS=["flour","sugar","milk","butter","cocoa","apples","marshmallows","vegetables","meat","chicken","stock","herbs","spices","pumpkin-orange","pumpkin-moonlight","pumpkin-witchfire","pumpkin-starlight","mixing-bowl"];
export const DISH_ART_IDS=["wedges","soup","toffee-apples","pumpkin-jam","ghost-cookies","pumpkin-pie","cocoa-brownies","moonlight-tart","garden-skillet","harvest-broth","spiced-roast","moonfire-chicken","haunted-pie","pumpkin-spice-biscuits","mixing-bowl","recipe-book"];
const markup=(cls,url,n,cols,rows,size)=>'<span class="'+cls+'" aria-hidden="true" style="display:inline-block;flex-shrink:0;width:'+size+'px;height:'+size+'px;background-image:url('+url+');background-size:'+cols*100+'% '+rows*100+'%;background-position:'+n%cols*100/(cols-1)+'% '+Math.floor(n/cols)*100/(rows-1)+'%"></span>';
// Ingredients newer than the painted sheet, drawn: the garden's berries and seeds, and the lake's fish and crayfish.
const svg=(size,body)=>'<svg class="ingredient-art" viewBox="0 0 32 32" width="'+size+'" height="'+size+'" aria-hidden="true" style="flex-shrink:0">'+body+'</svg>';
const DRAWN={
  fish:'<path d="M5 16l-3-5v10z" fill="#c4532a"/><ellipse cx="16" cy="16" rx="11" ry="6.5" fill="#f7d6a0"/><path d="M5.5 16q10.5-11 21 0z" fill="#d98b32"/><path d="M12 10.5v11M16 10v12M20 10.5v11" stroke="#5b3a25" stroke-width="1.2" opacity=".55"/><circle cx="23" cy="14.6" r="1.3" fill="#1d1a24"/>',
  crayfish:'<path d="M7 18h13l4-3-4-3H7z" fill="#9a3f2a"/><path d="M4 15l3 3-3 3z" fill="#d97a4f"/><path d="M20 12l5-5 3 2-4 4zM20 18l5 5 3-2-4-4z" fill="#d97a4f"/><path d="M9 12v6M12 12v6M15 12v6" stroke="#6e2a1c" stroke-width="1.1"/><circle cx="21" cy="14" r="1" fill="#1d1a24"/>',
  berries:'<circle cx="12" cy="18" r="5" fill="#3a2350"/><circle cx="20" cy="17" r="5" fill="#4b2a63"/><circle cx="16" cy="23" r="4.5" fill="#2f1c44"/><path d="M16 12q2-6 7-6" stroke="#5f7a33" stroke-width="2" fill="none"/><circle cx="13" cy="16" r="1" fill="#fff" opacity=".5"/>',
  seeds:'<ellipse cx="11" cy="14" rx="3" ry="5" fill="#efe2bf" transform="rotate(-25 11 14)"/><ellipse cx="20" cy="13" rx="3" ry="5" fill="#e8d9b0" transform="rotate(20 20 13)"/><ellipse cx="16" cy="22" rx="3" ry="5" fill="#f3e8c8" transform="rotate(80 16 22)"/>',
};
export function ingredientIcon(id,size=32){if(id.startsWith("pumpkin:"))id=["pumpkin-orange","pumpkin-moonlight","pumpkin-witchfire","pumpkin-starlight","pumpkin-starlight"][+id.slice(8)];const n=INGREDIENT_ART_IDS.indexOf(id);return n<0?(DRAWN[id]?svg(size,DRAWN[id]):""):markup("ingredient-art",ingredientURL,n,6,3,size);}
export function dishIcon(id,size=96){const extra=["cinders-lantern-stew","grannys-bramble-pudding"].indexOf(id);if(extra>=0)return '<span class="dish-art" data-expansion-dish="'+id+'" aria-hidden="true" style="display:inline-block;flex-shrink:0;width:'+size+'px;height:'+size+'px;background-image:url('+expansionDishURL+');background-size:200% 100%;background-position:'+extra*100+'% 50%"></span>';const n=DISH_ART_IDS.indexOf(id);return n<0?"":markup("dish-art",dishURL,n,4,4,size);}
