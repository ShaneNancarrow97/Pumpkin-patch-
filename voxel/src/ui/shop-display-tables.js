// Read-only table choices. The existing assignDisplay rule and data-display
// handler still own every change; choosing stock here never buys a pumpkin.
import * as M from "../model.js";

const NAMES = Object.freeze(["Back left", "Back right", "Front left", "Front right"]);
const cash = n => "£" + Math.floor(n).toLocaleString("en-GB");
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function shopDisplayTableView(state, selectedTable = 0) {
  const shop = state.shop, count = M.displayCount(shop);
  const selected = Math.max(0, Math.min(count - 1, Number.isInteger(selectedTable) ? selectedTable : 0));
  const tables = Array.from({ length: count }, (_, index) => {
    const variety = M.VARIETIES[shop.displays[index]] ? shop.displays[index] : null;
    return { index, name: NAMES[index], variety, product: variety === null ? null : M.VARIETIES[variety], available: variety === null ? 0 : M.available(state, variety) };
  });
  const table = tables[selected];
  const choices = [null, ...M.VARIETIES.map((_, index) => index)].map(variety => {
    const product = variety === null ? null : M.VARIETIES[variety];
    // Match assignDisplay's whole saved array, including a retained extra slot.
    const elsewhere = variety === null ? -1 : shop.displays.findIndex((value, index) => index !== selected && value === variety);
    return { variety, product, selected: table.variety === variety, elsewhere, available: variety === null ? 0 : M.available(state, variety), disabled: !shop.unlocked || elsewhere >= 0 };
  });
  return { selected, count, table, tables, choices };
}

export function renderShopDisplayTables(state, { selectedTable = 0, thumb = () => "" } = {}) {
  const view = shopDisplayTableView(state, selectedTable), table = view.table;
  const picture = (variety, size) => variety === null ? '<span class="skyla-display-empty" aria-hidden="true">—</span>' : `<span class="skyla-display-art" style="--display-art:${size}px" aria-hidden="true">${thumb(variety)}</span>`;
  return `<section class="skyla-display-section" aria-labelledby="skyla-display-title"><header class="skyla-display-heading"><div><h3 id="skyla-display-title">Display tables</h3><p>Choose a table, then tap the pumpkins to show.</p></div><span>${view.count} tables</span></header>
    <div class="skyla-display-tabs" data-pad-tabs role="tablist" aria-label="Choose a shop display table">${view.tables.map(item => `<button type="button" class="skyla-display-tab" id="skyla-display-table-${item.index}" role="tab" aria-controls="skyla-display-options" aria-selected="${item.index === view.selected}" aria-pressed="${item.index === view.selected}" data-display-table="${item.index}"><span class="skyla-display-table-top"><b>Table ${item.index + 1}</b><small>${item.name}</small></span>${picture(item.variety, 52)}<span class="skyla-display-table-copy"><strong>${esc(item.product?.name ?? "Empty table")}</strong><small>${item.product ? item.available ? `${item.available} available` : "Sold out" : "Ready to fill"}</small></span><span class="skyla-display-tab-mark" aria-hidden="true">${item.index === view.selected ? "Editing" : "Choose"}</span></button>`).join("")}</div>
    <div id="skyla-display-options" class="skyla-display-options" role="tabpanel" aria-labelledby="skyla-display-table-${view.selected}"><div class="skyla-display-choice-heading"><div><small>Table ${view.selected + 1} · ${table.name}</small><h4>${esc(table.product ? `${table.product.name} on show` : "What would you like to show?")}</h4></div><span class="skyla-display-free">Free to change</span></div>
    <div class="skyla-display-grid" role="group" aria-label="Pumpkins for table ${view.selected + 1}">${view.choices.map(choice => {
      const name = choice.product?.name ?? "Clear table", status = choice.elsewhere >= 0 ? choice.elsewhere < view.count ? `On Table ${choice.elsewhere + 1}` : "On an extra table" : choice.selected ? choice.product ? "On this table" : "Table is empty" : choice.product ? choice.available ? `${choice.available} available` : "Sold out · harvest to restock" : "Leave this table empty";
      const visibleStatus=status.startsWith("Sold out")?"Sold out":status;
      return `<button type="button" class="skyla-display-choice${choice.selected ? " is-selected" : ""}" data-display="${view.selected}:${choice.variety}" aria-pressed="${choice.selected}"${choice.disabled ? " disabled" : ""} aria-label="${esc(`${name}. ${status}${choice.product ? `. ${cash(choice.product.price)} base price each` : ""}`)}">${picture(choice.variety, 68)}<span class="skyla-display-choice-copy"><b>${esc(name)}</b>${choice.product ? `<small class="skyla-display-price">${cash(choice.product.price)} <span>base price</span></small>` : ""}<small class="skyla-display-choice-status">${esc(visibleStatus)}</small></span><span class="skyla-display-check" aria-hidden="true">${choice.selected ? "✓" : ""}</span></button>`;
    }).join("")}</div><p class="skyla-display-note">One table per variety. Available pumpkins refill it automatically; harvest to restock.</p></div></section>`;
}
