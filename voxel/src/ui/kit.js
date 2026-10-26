import { kitchenWorkshopIcon } from "./kitchen-workshop-icons.js";
// Small shared pieces of the menus.
import { DECOR_ART } from "../decor-meta.js";
import { decorThumb } from "../decor.js";
import { PREMIUM_WALL_THUMBS } from "../premium-wall-thumbs.js";
import { PREMIUM_FURNITURE_THUMBS } from "../premium-furniture-thumbs.js";
import { SHELF_CATALOG } from "../content/shelf-catalog.js";
import shelfSheet from "../../assets/shelf-thumbs/shelves.webp";

export const money = (n) => "£" + Math.floor(n).toLocaleString("en-GB");
export const $ = (id) => document.getElementById(id);

// A row of tabs inside a sheet. `name` keys the buttons: data-<name>="value".
export const segmented = (name, label, options, current) =>
  `<div class="segmented" role="group" aria-label="${label}">${options.map(([value, text]) => `<button data-${name}="${value}" aria-pressed="${value === current}">${text}</button>`).join("")}</div>`;

// The blank shelves' icons share one sheet (tools/render-shelf-thumbs.mjs): a row
// per shelf, a column per finish. A short blob URL keeps its data out of every menu's HTML.
const SHELF_ROW = Object.fromEntries(SHELF_CATALOG.map((s, i) => [s.id, i]));
const shelfUrl = (() => { try { return URL.createObjectURL(new Blob([Uint8Array.from(atob(shelfSheet.split(",")[1]), (c) => c.charCodeAt(0))], { type: "image/webp" })); } catch { return shelfSheet; } })();
function shelfIcon(id, size, finish) {
  const row = SHELF_ROW[id], item = SHELF_CATALOG[row], col = Math.max(0, item.finishes.findIndex((f) => f.id === finish)), cols = item.finishes.length;
  return `<span class="thumb"><span style="width:${size}px;height:${size}px;background:url(${shelfUrl}) -${col * size}px -${row * size}px / ${cols * size}px ${SHELF_CATALOG.length * size}px no-repeat"></span></span>`;
}

// A piece of the original art from the decor atlas, as crisp pixel art in a
// thumbnail; finish picks a blank shelf's colour (the first if left out).
export function decorIcon(id, size = 52, finish) {
  const kitchen = kitchenWorkshopIcon(id); if (kitchen) return `<span class="thumb" style="--thumb:${size}px">${kitchen}</span>`;
  if (SHELF_ROW[id] !== undefined) return shelfIcon(id, size, finish);
  const thumb=PREMIUM_WALL_THUMBS[id]??PREMIUM_FURNITURE_THUMBS[id];
  if (thumb) return `<span class="thumb"><img src="${thumb}" alt="" style="width:${size}px;height:${size}px;object-fit:contain"></span>`;
  const a = DECOR_ART[id];
  if (!a) return `<span class="thumb"></span>`;
  const k = Math.min(size / a.w, size / a.h);
  return `<span class="thumb"><span class="pix" style="width:${a.w}px;height:${a.h}px;background-image:url(${decorThumb()});background-position:-${a.x}px -${a.y}px;transform:scale(${k.toFixed(3)})"></span></span>`;
}

// Haunting points as little ghosts.
export const spooky = (n) => (n ? `<span class="spooky" title="${n} haunting point${n === 1 ? "" : "s"}">${"<i></i>".repeat(n)}</span>` : "");

export const plural = (n, one, many = one + "s") => `${n} ${n === 1 ? one : many}`;
