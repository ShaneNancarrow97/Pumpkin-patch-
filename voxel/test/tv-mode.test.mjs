// TV mode (handover 65): the zoom that fits menus to a mirrored 16:9 TV, and
// which way each kind of device reaches the TV.
import test from "node:test";
import assert from "node:assert/strict";
import { tvZoom, castRoute, CAST_STEPS, TV_SIZES } from "../src/ui/tv-mode.js";

test("the zoom follows the screen's height, within bounds", () => {
  // A folded phone mirrored at 16:9 (412 tall) and an unfolded Fold (750 tall).
  assert.equal(tvZoom(412), .589);
  assert.equal(tvZoom(750), .75, "capped, so an unfolded Fold's menus don't fill the TV");
  assert.ok(tvZoom(468) > tvZoom(412) && tvZoom(468) < tvZoom(750), "taller screens shrink less");
  assert.equal(tvZoom(2000), .75); assert.equal(tvZoom(100), .45);
  assert.equal(tvZoom(undefined), .75, "an unknown height is treated as a large screen");
});

test("each size scales the zoom, never past life size", () => {
  const [compact, standard, large] = TV_SIZES.map(([id]) => tvZoom(412, id));
  assert.ok(compact < standard && standard < large);
  assert.equal(standard, tvZoom(412, "no such size"), "an unknown size is standard");
  for (const [id] of TV_SIZES) for (const h of [200, 412, 540, 750, 1080]) { const z = tvZoom(h, id); assert.ok(z > .35 && z <= 1, `${id} at ${h}: ${z}`); }
});

test("devices reach the TV their own way, and every way has steps", () => {
  assert.equal(castRoute("Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36"), "android");
  assert.equal(castRoute("Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-F966B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/27.0 Chrome/125.0.0.0 Mobile Safari/537.36"), "android");
  assert.equal(castRoute("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"), "apple");
  assert.equal(castRoute("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15"), "mac");
  assert.equal(castRoute("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"), "chrome");
  assert.equal(castRoute(""), "other");
  for (const route of ["android", "apple", "mac", "chrome", "other"]) assert.ok(CAST_STEPS[route]?.length >= 3, route);
});
