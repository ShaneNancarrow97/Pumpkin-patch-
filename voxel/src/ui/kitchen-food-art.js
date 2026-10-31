import ingredients from "../../assets/kitchen-ingredients.webp";
import dishes from "../../assets/kitchen-dishes.webp";
const blob = data => {
  try { if(!data.startsWith("data:"))return data; return URL.createObjectURL(new Blob([Uint8Array.from(atob(data.split(",")[1]), c => c.charCodeAt(0))], {type:"image/webp"})); } catch {return data;}
};
const ingredientURL=blob(ingredients),dishURL=blob(dishes);
export const INGREDIENT_ART_IDS=["flour","sugar","milk","butter","cocoa","apples","marshmallows","vegetables","meat","chicken","stock","herbs","spices","pumpkin-orange","pumpkin-moonlight","pumpkin-witchfire","pumpkin-starlight","mixing-bowl"];
export const DISH_ART_IDS=["wedges","soup","toffee-apples","pumpkin-jam","ghost-cookies","pumpkin-pie","cocoa-brownies","moonlight-tart","garden-skillet","harvest-broth","spiced-roast","moonfire-chicken","haunted-pie","pumpkin-spice-biscuits","mixing-bowl","recipe-book"];
const markup=(cls,url,n,cols,rows,size)=>'<span class="'+cls+'" aria-hidden="true" style="display:inline-block;flex-shrink:0;width:'+size+'px;height:'+size+'px;background-image:url('+url+');background-size:'+cols*100+'% '+rows*100+'%;background-position:'+n%cols*100/(cols-1)+'% '+Math.floor(n/cols)*100/(rows-1)+'%"></span>';
export function ingredientIcon(id,size=32){if(id.startsWith("pumpkin:"))id=["pumpkin-orange","pumpkin-moonlight","pumpkin-witchfire","pumpkin-starlight","pumpkin-starlight"][+id.slice(8)];const n=INGREDIENT_ART_IDS.indexOf(id);return n<0?"":markup("ingredient-art",ingredientURL,n,6,3,size);}
export function dishIcon(id,size=96){const n=DISH_ART_IDS.indexOf(id);return n<0?"":markup("dish-art",dishURL,n,4,4,size);}
