// Mark only priced purchase actions; navigation, claims and owned items stay quiet.
const PURCHASES = ["buy", "visitup", "shopup", "plot", "decor", "house", "buystyle", "costume", "look", "care-upgrade", "estate-buy", "estate-buyfinish", "estate-buyskin", "estate-expand", "estate-house", "foyer-buy", "foyer-buyfinish", "special-stock", "maze-buy"].map(name => `[data-${name}]`).join(",") + ',[data-hollow-action="purchase"],[data-hollow-action="restore"],[data-hollow-action="upgrade"],[data-festival-action="land"],[data-festival-action="upgrade"],[data-festival-action="restock"],[data-festival-action="courier"]';
export function markPurchaseSurfaces(root) {
  for (const button of root.querySelectorAll(PURCHASES)) {
    if (!button.textContent.includes("£")) continue;
    button.classList.add("purchase-button");
    const card = button.closest(".card,.estate-card,.estate-ground-card,.plot-card,.maze-prefab-card");
    if (card) { card.classList.add("purchase-card"); if (!button.disabled) card.classList.add("purchase-available"); }
  }
}
