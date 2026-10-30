import { cookingIcon } from "./cooking-icons.js";
// The dock's Manage button: a menu that rises above the dock in the middle of
// the screen, one choice for each part of the upgrades sheet, over a dimmed
// farm. Arrow keys (or a pad) move through it, Escape or a tap elsewhere
// closes it, and choosing opens the sheet at that section.
export const UPGRADE_SECTIONS = [
  ["farm", "Farm upgrades", "tools", "Tools, yield, helpers, plots and the barn"],
  ["seeds", "Seeds", "seeds", "New pumpkin varieties"],
  ["shop", "Skyla’s shop", "shop", "Skyla’s shop and customer care"],
  ["cocoa", "Sandy’s cocoa", "talk", "Sandy’s stand and the meadow"],
  ["cooking", "Maisie’s kitchen", "shop", "Food truck, pantry, recipes and food shelves"],
  ["stall", "Stock", "stock", "The stall, stock and the market cart"],
  ["homelife", "Home & care", "home", "Home goals, hands-on play and the janitor"],
  ["visitors", "Visitors & VIPs", "visitors", "Crowds, spending, harvest rushes & the midnight court"],
];
export function createUpgradeMenu({ button, choose }) {
  const menu = document.createElement("div"); menu.className = "upgrade-menu"; menu.id = "upgrade-menu"; menu.hidden = true;
  menu.setAttribute("role", "menu"); menu.setAttribute("aria-label", "Manage farm and businesses");
  const groups=[['Grow your patch',['farm','seeds','stall','visitors','homelife']],['Your businesses',['shop','cocoa','cooking']]];
  menu.innerHTML=`<header class="manage-menu-heading"><b>Manage your patch</b><span>Choose where to make a difference</span></header>`+groups.map(([label,ids])=>`<div class="manage-menu-group" role="group" aria-label="${label}"><p>${label}</p>${ids.map(id=>{const [,name,icon,text]=UPGRADE_SECTIONS.find(s=>s[0]===id);return `<button type="button" role="menuitem" data-upgrade-section="${id}">${id==='cooking'?cookingIcon('truck'):`<span class="ico i-${icon}" aria-hidden="true"></span>`}<span><b>${name}</b><small>${text}</small></span><i aria-hidden="true">›</i></button>`}).join('')}</div>`).join('');
  document.body.append(menu);
  button.setAttribute("aria-haspopup", "menu"); button.setAttribute("aria-controls", menu.id); button.setAttribute("aria-expanded", "false");
  const items = () => [...menu.querySelectorAll("[role=menuitem]")];
  const place = () => {
    const at = button.getClientRects().length ? button.getBoundingClientRect() : {left:innerWidth/2,width:0,top:innerHeight-20}, width = Math.min(380, innerWidth - 16);
    menu.style.width = width + "px";
    menu.style.left = Math.round((innerWidth - width) / 2) + "px";
    menu.style.bottom = Math.max(8, innerHeight - at.top + 8) + "px";
  };
  const close = (focus = false) => { if (menu.hidden) return; menu.hidden = true; document.body.classList.remove("manage-open"); button.setAttribute("aria-expanded", "false"); if (focus) button.focus({ preventScroll: true }); };
  const open = () => { place(); menu.hidden = false; document.body.classList.add("manage-open"); button.setAttribute("aria-expanded", "true"); items()[0].focus({ preventScroll: true }); };
  menu.addEventListener("click", (e) => { const id = e.target.closest("[data-upgrade-section]")?.dataset.upgradeSection; if (id) { close(); choose(id); } });
  menu.addEventListener("keydown", (e) => {
    const list = items(), at = list.indexOf(document.activeElement);
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(true); }
    else if (e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); list[(at + (e.key === "ArrowDown" ? 1 : -1) + list.length) % list.length].focus(); }
    else if (e.key === "Home" || e.key === "End") { e.preventDefault(); list.at(e.key === "Home" ? 0 : -1).focus(); }
    else if (e.key === "Tab") close();
  });
  document.addEventListener("pointerdown", (e) => { if (!menu.hidden && !menu.contains(e.target) && !button.contains(e.target)) close(); }, { capture: true });
  addEventListener("resize", () => { if (!menu.hidden) place(); });
  return { get open() { return !menu.hidden; }, toggle() { if (menu.hidden) open(); else close(true); }, close };
}
