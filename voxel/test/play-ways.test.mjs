import test from "node:test";
import assert from "node:assert/strict";
import { playWays, wayThrough, inZone, gardenGeometry, gardenDoorstep } from "../src/play-ways.js";
import { playerPointFree, farmPlayerGeometry } from "../src/player-control.js";
import { roomLayout } from "../src/rules/house.js";
import { freshState } from "../src/model.js";

const at = (level, expansion = 0) => { const s = freshState(); s.house.level = level; s.estate.expansion = expansion; return s; };
const places = (s) => ["farm", "estate", ...["parlour", "bedroom", "kitchen", "attic"].filter((r) => roomLayout(s, r)).map((r) => "room:" + r)];
// Rooms without furniture: the walls and the stairs.
function geometry(s, place) {
  if (place === "farm") return farmPlayerGeometry(s);
  if (place === "estate") return gardenGeometry(s);
  const L = roomLayout(s, place.slice(5));
  return { bounds: { x0: 0, x1: L.w, z0: 0, z1: L.d }, obstacles: L.stairs.map((st) => ({ x: st.x + st.w / 2, z: st.z + st.d / 2, w: st.w, d: st.d })) };
}
const free = (s, place, p) => { const g = geometry(s, place); return playerPointFree(p.x, p.z, g.bounds, g.obstacles); };

test("every way lands somewhere walkable, outside every way of the place it reaches", () => {
  for (const level of [0, 1, 2, 3]) for (const expansion of [0, 3]) {
    const s = at(level, expansion);
    for (const place of places(s)) for (const way of playWays(s, place)) {
      const a = way.arrive, label = `${place} ${way.id} (level ${level}, garden ${expansion})`;
      assert.equal(a.place, way.to, label);
      assert.ok(free(s, a.place, a), `${label} arrives on open ground at ${a.x.toFixed(2)}, ${a.z.toFixed(2)}`);
      for (const back of playWays(s, a.place)) assert.ok(!inZone(back.zone, a), `${label} does not arrive in ${back.id}'s strip`);
      assert.ok(Math.hypot(a.face.x, a.face.z) > .99, label);
    }
  }
});

test("each way's strip is where the walking feet stop, and walking into it goes through", () => {
  for (const level of [0, 1, 2, 3]) {
    const s = at(level);
    for (const place of places(s)) for (const way of playWays(s, place)) {
      if (!way.zone) continue;
      const z = way.zone, mid = { x: (z.x0 + z.x1) / 2, z: (z.z0 + z.z1) / 2 };
      // Walk from well inside towards the way until the feet stop.
      let p = [2, 1.2, .8, .45].map((d) => ({ x: mid.x - way.dir.x * d, z: mid.z - way.dir.z * d })).find((q) => free(s, place, q));
      assert.ok(p, `${place} ${way.id}: room to walk up to it (level ${level})`);
      for (let i = 0; i < 400; i++) { const n = { x: p.x + way.dir.x * .01, z: p.z + way.dir.z * .01 }; if (!free(s, place, n)) break; p = n; }
      assert.ok(inZone(z, p), `${place} ${way.id}: the feet stop in its strip (level ${level}) at ${p.x.toFixed(2)}, ${p.z.toFixed(2)}`);
      assert.equal(wayThrough(playWays(s, place), p, way.dir)?.id, way.id, `${place} ${way.id} goes through (level ${level})`);
    }
  }
});

test("ways go through only when walked into, and only once armed", () => {
  const s = at(2), ways = playWays(s, "room:parlour"), door = ways.find((w) => w.id === "door:kitchen");
  const p = { x: .3, z: 3 };
  assert.equal(wayThrough(ways, p, { x: -1, z: 0 })?.id, "door:kitchen");
  assert.equal(wayThrough(ways, p, { x: 0, z: 1 }), null, "walking along the wall past it");
  assert.equal(wayThrough(ways, p, { x: -.1, z: 0 }), null, "barely touching the stick");
  assert.equal(wayThrough(ways, p, { x: -1, z: 0 }, (w) => w !== door), null, "not armed yet");
  assert.equal(door.arrive.place, "room:kitchen");
  assert.ok(door.arrive.x > roomLayout(s, "kitchen").w - 1.5, "comes in by the kitchen's own doorway");
});

test("in the bedroom, the ladder takes the landing and the stairs take the well's side", () => {
  const s = at(3), ways = playWays(s, "room:bedroom"), w = roomLayout(s, "bedroom").w;
  assert.equal(wayThrough(ways, { x: w - 1.3, z: .5 }, { x: 1, z: 0 })?.to, "room:attic");
  assert.equal(wayThrough(ways, { x: w - 1.3, z: 3 }, { x: 1, z: 0 })?.to, "room:parlour");
  const lower = at(1), stairs = playWays(lower, "room:bedroom");
  assert.equal(wayThrough(stairs, { x: roomLayout(lower, "bedroom").w - 1.3, z: .5 }, { x: 1, z: 0 })?.to, "room:parlour", "with no ladder yet the landing leads down");
});

test("the farm, the garden and the house join up both ways", () => {
  const s = at(1, 2), out = (place, to) => playWays(s, place).find((w) => w.to === to);
  assert.equal(out("farm", "estate").arrive.place, "estate");
  assert.equal(out("estate", "farm").arrive.place, "farm");
  assert.equal(out("estate", "room:parlour").arrive.place, "room:parlour");
  assert.equal(out("room:parlour", "estate").arrive.place, "estate");
  assert.deepEqual(out("room:parlour", "estate").arrive, gardenDoorstep(s));
  assert.equal(out("room:bedroom", "estate"), undefined, "upstairs has no way out but the stairs");
});

test("the garden is walked round its house and decor, through its rose arch", () => {
  const s = at(2, 1);
  s.estate.placed.push({ instance: "t-1", id: "rose-arch", x: 9, z: 9, rotation: 0 }, { instance: "t-2", id: "moon-fountain", x: -10, z: 8, rotation: 30 });
  const g = gardenGeometry(s), walk = (x, z) => playerPointFree(x, z, g.bounds, g.obstacles);
  assert.equal(walk(0, 0), false, "not through the house");
  assert.equal(walk(-6.1, -.3), false, "nor the kitchen wing");
  assert.equal(walk(0, 7), true, "the path");
  assert.equal(walk(-10, 8), false, "the fountain");
  assert.equal(walk(9, 9), true, "under the rose arch");
  assert.equal(walk(10.13, 9), false, "but not through its posts");
  assert.equal(walk(-3, 8), false, "the welcome lanterns");
  assert.equal(walk(0, 20), false, "nor over the fence");
});

test("the garden's door and gate have prompts that lead to their ways", async () => {
  const { gardenTargets } = await import("../src/play-ways.js");
  const s = at(1, 1), ways = playWays(s, "estate");
  for (const t of gardenTargets(s)) {
    const way = ways.find((w) => w.id === t.way);
    assert.ok(way, t.label);
    assert.ok(free(s, "estate", t) || Math.hypot(t.x - (way.zone.x0 + way.zone.x1) / 2, t.z - (way.zone.z0 + way.zone.z1) / 2) < 1, `${t.label} sits by its way`);
  }
});
