import { cookingIcon } from "./cooking-icons.js";
// The dock's Upgrades button: a small menu that rises above it, one choice
// for each part of the upgrades sheet. Arrow keys move through it, Escape or
// a tap elsewhere closes it, and choosing opens the sheet at that section.
export const UPGRADE_SECTIONS = [
  ["farm", "Farm", "tools", "Tools, yield, helpers, plots and the barn"],
  ["seeds", "Seeds", "seeds", "New pumpkin varieties"],
  ["shop", "Shop", "shop", "Skyla’s shop and customer care"],
  ["cocoa", "Cocoa", "talk", "Sandy’s stand and the meadow"],
  ["cooking", "Cooking", "shop", "Food truck, pantry, recipes and food shelves"],
  ["stall", "Stock", "stock", "The stall, stock and the market cart"],
  ["visitors", "Visitors", "visitors", "More neighbours, more often"],
];
export function createUpgradeMenu({ button, choose }) {
  const menu = document.createElement("div"); menu.className = "upgrade-menu"; menu.id = "upgrade-menu"; menu.hidden = true;
  menu.setAttribute("role", "menu"); menu.setAttribute("aria-label", "Upgrades");
  menu.innerHTML = UPGRADE_SECTIONS.map(([id, name, icon, text], i) => `<button type="button" role="menuitem" data-upgrade-section="${id}" style="--i:${UPGRADE_SECTIONS.length - 1 - i}">${id === "cooking" ? cookingIcon("truck") : `<span class="ico i-${icon}" aria-hidden="true"></span>`}<span><b>${name}</b><small>${text}</small></span></button>`).join("");
  document.body.append(menu);
  button.setAttribute("aria-haspopup", "menu"); button.setAttribute("aria-controls", menu.id); button.setAttribute("aria-expanded", "false");
  const items = () => [...menu.querySelectorAll("[role=menuitem]")];
  const place = () => {
    const at = button.getBoundingClientRect(), width = Math.min(280, innerWidth - 16);
    menu.style.width = width + "px";
    menu.style.left = Math.max(8, Math.min(innerWidth - width - 8, at.left + at.width / 2 - width / 2)) + "px";
    menu.style.bottom = Math.max(8, innerHeight - at.top + 8) + "px";
  };
  const close = (focus = false) => { if (menu.hidden) return; menu.hidden = true; button.setAttribute("aria-expanded", "false"); if (focus) button.focus({ preventScroll: true }); };
  const open = () => { place(); menu.hidden = false; button.setAttribute("aria-expanded", "true"); items()[0].focus({ preventScroll: true }); };
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
