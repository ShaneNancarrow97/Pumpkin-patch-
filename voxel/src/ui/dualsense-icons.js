// Vector controller symbols follow the supplied PlayStation reference. They
// remain decorative; the containing button supplies its complete spoken name.
const FACE = Object.freeze({ cross: "#8b98c4", circle: "#e85858", square: "#d08ab9", triangle: "#00bbb5" });
const INK = "var(--ps5-ink,#b7cbd8)", FRAME = "var(--ps5-frame,var(--ps5-ink,#b7cbd8))";
const line = (d, colour = INK) => `<path d="${d}" stroke="${colour}"/>`;
const circle = (cx, cy, r, colour = FRAME) => `<circle cx="${cx}" cy="${cy}" r="${r}" stroke="${colour}"/>`;
const rect = (x, y, w, h, r = 2, colour = FRAME) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" stroke="${colour}"/>`;
const letter = (side, x = 11, y = 11) => side === "l" ? line(`M${x} ${y}v10h6`) : line(`M${x} ${y}v10m0-10h4a3 3 0 0 1 0 6h-4m4 0 3 4`);
const digit = (n, x = 19, y = 11) => n === "1" ? line(`m${x} ${y + 2} 2 -2v10m-2 0h4`) : n === "2" ? line(`M${x} ${y + 2}c0-3 5-3 5 0 0 2-5 3-5 7h5`) : line(`M${x} ${y}h3c3 0 3 4 0 4h-2m2 0c3 0 3 5 0 5h-3`);
const FACE_PATH = Object.freeze({ cross: "M11 11l10 10m0-10L11 21", circle: "M23 16a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z", square: "M10 10h12v12H10Z", triangle: "m16 9 8 14H8Z" });
const ARROW = Object.freeze({ up: "m13 8 3-3 3 3", right: "m24 13 3 3-3 3", down: "m13 24 3 3 3-3", left: "m8 13-3 3 3 3" });
const ALIASES = Object.freeze({ x: "cross", o: "circle", l: "ls", r: "rs", lstick: "ls", rstick: "rs", dpadup: "up", dpaddown: "down", dpadleft: "left", dpadright: "right", menu: "options", touch: "touchpad" });

// All shapes use a shared32px drawing grid and non-scaling strokes, so a
// sixteen-pixel legend never loses the thin outlines to a fractional stroke.
function artwork(id) {
  if (Object.hasOwn(FACE_PATH, id)) return circle(16, 16, 14, `var(--ps5-frame,var(--ps5-accent,${FACE[id]}))`) + line(FACE_PATH[id], `var(--ps5-accent,${FACE[id]})`);
  if (id === "dpad" || Object.hasOwn(ARROW, id)) {
    const cross = line("M12 3h8v9h9v8h-9v9h-8v-9H3v-8h9Z");
    return cross + (id === "dpad" ? Object.values(ARROW).map(d => line(d)).join("") : line(ARROW[id], "var(--ps5-accent,#f2c276)"));
  }
  if (["ls", "rs", "l3", "r3"].includes(id)) {
    const side = id[0], clicked = id.endsWith("3");
    const symbol = clicked ? letter(side, 9, 11) + digit("3", 20, 12) : letter(side, side === "l" ? 13 : 12, 11);
    return circle(16, 16, 14) + circle(16, 16, 11.2, "var(--ps5-inner,var(--ps5-ink,#b7cbd8))") + symbol;
  }
  if (["l1", "r1", "l2", "r2"].includes(id)) {
    const trigger = id.endsWith("2");
    const shape = trigger ? line("M5 24V12c0-4 2-7 6-8l12-2c3-.5 5 2 5 5v17Z") : line("M3 24V13c0-5 3-8 8-8h10c5 0 8 3 8 8v11Z");
    return shape + letter(id[0], 9, 11) + digit(id[1], 20, 11);
  }
  if (id === "options") return rect(11, 3, 10, 26, 5) + line("M14 11h4m-4 5h4m-4 5h4");
  if (id === "create") return rect(11, 3, 10, 26, 5) + line("M16 9v10m-3-3 3 3 3-3m-6 6h6");
  if (id === "touchpad") {
    let dots = "";
    for (let y = 11; y <= 21; y += 5) for (let x = 8; x <= 24; x += 4) dots += `<circle cx="${x}" cy="${y}" r=".65" fill="${INK}" stroke="none"/>`;
    return rect(3, 7, 26, 19, 4) + dots;
  }
  return "";
}

export function ps5Icon(id, size = 24) {
  if (typeof id !== "string") return "";
  const key = id.toLowerCase(), name = Object.hasOwn(ALIASES, key) ? ALIASES[key] : key;
  const art = artwork(name); if (!art) return "";
  const pixels = Math.min(64, Math.max(16, Number(size) || 24));
  const drawn = art.replace(/<(path|circle|rect) /g, '<$1 vector-effect="non-scaling-stroke" stroke-width="1.5" ');
  return `<span class="ps5-icon ps5-icon-${name}" data-ps5-icon="${name}" aria-hidden="true" style="display:inline-flex;inline-size:${pixels}px;block-size:${pixels}px;flex:none;vertical-align:middle;line-height:0"><svg viewBox="0 0 32 32" width="${pixels}" height="${pixels}" fill="none" stroke-linecap="round" stroke-linejoin="round" focusable="false" style="display:block;inline-size:100%;block-size:100%"><title>${name.toUpperCase()}</title>${drawn}</svg></span>`;
}
