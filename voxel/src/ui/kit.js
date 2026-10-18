// Small shared pieces of the menus.
import { DECOR_ART } from "../decor-meta.js";
import { decorThumb } from "../decor.js";

export const money = (n) => "£" + Math.floor(n).toLocaleString("en-GB");
export const $ = (id) => document.getElementById(id);

// A row of tabs inside a sheet. `name` keys the buttons: data-<name>="value".
export const segmented = (name, label, options, current) =>
  `<div class="segmented" role="group" aria-label="${label}">${options.map(([value, text]) => `<button data-${name}="${value}" aria-pressed="${value === current}">${text}</button>`).join("")}</div>`;

// A piece of the original art from the decor atlas, as crisp pixel art in a thumbnail.
export function decorIcon(id, size = 52) {
  const a = DECOR_ART[id];
  if (!a) return `<span class="thumb"></span>`;
  const k = Math.min(size / a.w, size / a.h);
  return `<span class="thumb"><span class="pix" style="width:${a.w}px;height:${a.h}px;background-image:url(${decorThumb()});background-position:-${a.x}px -${a.y}px;transform:scale(${k.toFixed(3)})"></span></span>`;
}

// Haunting points as little ghosts.
export const spooky = (n) => (n ? `<span class="spooky" title="${n} haunting point${n === 1 ? "" : "s"}">${"<i></i>".repeat(n)}</span>` : "");

export const plural = (n, one, many = one + "s") => `${n} ${n === 1 ? one : many}`;
