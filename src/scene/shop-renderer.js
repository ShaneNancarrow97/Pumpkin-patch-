import { asset } from "../platform/assets.js";
import { availableQuantity } from "../core/inventory.js";
import { visitorArtMeta } from "../content/animation-meta.mjs";
import { skylaArt } from "../content/skyla-meta.mjs";
import { shopScene } from "./shop-layout.js";

function createShopRenderer(sharedArt) {
  const background = new Image(), pumpkins = sharedArt.pumpkins, skyla = new Image();
  background.src = asset(shopScene.background);
  skyla.src = asset(skylaArt.path);
  const visitors = sharedArt.visitors;
  const positions = /* @__PURE__ */ new Map();
  let lastCanvas = null, context = null;
  const blend = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  function customerPosition(c, shop) {
    const place = shopScene.browsePlaces[c.slot];
    if (c.phase === "entering") return blend(shopScene.entrance, place, 1 - c.remaining / 3);
    if (c.phase === "leaving") return blend(c.outcome === "bought" ? shopScene.checkout : place, shopScene.entrance, 1 - c.remaining / 3);
    if (c.phase === "paying") {
      const spent = c.checkoutDuration - c.remaining;
      return blend(place, shopScene.checkout, Math.max(0, Math.min(1, spent / 0.65)));
    }
    return place;
  }
  function draw(canvas, state, dt, time, reduced) {
    if (lastCanvas !== canvas) {
      lastCanvas = canvas;
      context = canvas.getContext("2d");
      canvas.width = 1e3;
      canvas.height = 660;
    }
    const ctx = context, s = state.shop;
    ctx.clearRect(0, 0, 1e3, 660);
    if (background.complete && background.naturalWidth) ctx.drawImage(background, 0, 0, 1e3, 660);
    else {
      ctx.fillStyle = "#2e202b";
      ctx.fillRect(0, 0, 1e3, 660);
    }
    for (let i = 0; i < 4; i++) {
      const product = s.displays[i], point = shopScene.displays[i];
      if (!s.unlocked || i >= (s.displayLevel ? 4 : 2) || !product || !availableQuantity(state.inventory, product)) continue;
      const filters = { "pumpkin-orange": "none", "pumpkin-moonlight": "grayscale(.88) brightness(1.25)", "pumpkin-witchfire": "hue-rotate(245deg) saturate(.9)", "pumpkin-starlight": "hue-rotate(20deg) brightness(1.35) saturate(.85)" };
      if (pumpkins.complete && pumpkins.naturalWidth) {
        ctx.save();
        ctx.filter = filters[product];
        const frame = reduced || state.paused ? 0 : Math.floor(time * 4 + i * 0.4) % 6;
        const sw = pumpkins.width / 3, sh = pumpkins.height / 2;
        const n = Math.min(3, availableQuantity(state.inventory, product));
        for (let k = 0; k < n; k++) ctx.drawImage(pumpkins, frame % 3 * sw, Math.floor(frame / 3) * sh, sw, sh, point.x - 33 + k * 12, point.y - 38 - k % 2 * 5, 48, 48);
        ctx.restore();
      }
    }
    if (skyla.complete && skyla.naturalWidth) {
      const paying = s.customers.some((c) => c.phase === "paying");
      const phase = time % 5, frame = reduced || state.paused ? 0 : paying ? 3 : phase < 3 ? 0 : phase < 3.8 ? 1 : phase < 4 ? 2 : 0;
      const r = skylaArt.rects[frame], scale = shopScene.skyla.height / skylaArt.anchor[1];
      const anchorX = skylaArt.anchor[0] - (r[0] - frame * skylaArt.cellWidth), anchorY = skylaArt.anchor[1] - r[1];
      ctx.drawImage(skyla, ...r, shopScene.skyla.x - anchorX * scale, shopScene.skyla.y - anchorY * scale, r[2] * scale, r[3] * scale);
    }
    const present = new Set(s.customers.map((c) => c.id));
    for (const id of positions.keys()) if (!present.has(id)) positions.delete(id);
    const posed = s.customers.map((c) => {
      const target = customerPosition(c, s), previous = positions.get(c.id);
      const point = previous && !reduced && !state.paused ? blend(previous, target, Math.min(1, dt * 18)) : target;
      positions.set(c.id, point);
      return { c, point };
    }).sort((a, b) => a.point.y - b.point.y);
    for (const { c, point } of posed) {
      const moving = c.phase === "entering" || c.phase === "leaving" || c.phase === "paying" && c.checkoutDuration - c.remaining < 0.65;
      const meta = visitorArtMeta[c.model], image = visitors[c.model], frame = moving && !reduced && !state.paused ? Math.floor(time * 5) % 4 : 0;
      const r = meta.rects[frame], height = c.model === "ghost" ? 98 : 128, scale = height / meta.height;
      ctx.fillStyle = "#08030b66";
      ctx.beginPath();
      ctx.ellipse(point.x, point.y + 2, 22, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      if (image.complete && image.naturalWidth) ctx.drawImage(image, ...r, point.x - r[2] * scale / 2, point.y - r[3] * scale, r[2] * scale, r[3] * scale);
    }
  }
  function drawMap(ctx, state, time) {
    if (skyla.complete && skyla.naturalWidth) {
      const frame = reducedMap(state) ? 0 : time % 5 > 3.8 && time % 5 < 4 ? 2 : 0, r = skylaArt.rects[frame], scale = 43 / skylaArt.anchor[1];
      const ax = skylaArt.anchor[0] - (r[0] - frame * skylaArt.cellWidth), ay = skylaArt.anchor[1] - r[1];
      ctx.drawImage(skyla, ...r, 849 - ax * scale, 247 - ay * scale, r[2] * scale, r[3] * scale);
    }
    for (const c of state.shop.customers) {
      if (c.phase !== "entering" && c.phase !== "leaving") continue;
      const t = 1 - c.remaining / 3, point = c.phase === "entering" ? blend({ x: 1030, y: 379 }, { x: 850, y: 321 }, t) : blend({ x: 850, y: 321 }, { x: 1030, y: 379 }, t);
      const image = visitors[c.model], meta = visitorArtMeta[c.model], frame = reducedMap(state) ? 0 : Math.floor(time * 5) % 4, r = meta.rects[frame], scale = (c.model === "ghost" ? 76 : 100) / meta.height;
      if (image.complete && image.naturalWidth) {
        ctx.save();
        ctx.globalAlpha = c.phase === "entering" ? Math.min(1, c.remaining) : Math.min(1, t * 3);
        ctx.drawImage(image, ...r, point.x - r[2] * scale / 2, point.y - r[3] * scale, r[2] * scale, r[3] * scale);
        ctx.restore();
      }
    }
  }
  const reducedMotion = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function reducedMap(state) {
    return reducedMotion || state.paused;
  }
  return { draw, drawMap, reset() {
    positions.clear();
    lastCanvas = null;
    context = null;
  } };
}

export { createShopRenderer };
