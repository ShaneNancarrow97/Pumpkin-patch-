import test from "node:test";
import assert from "node:assert/strict";
import { normaliseVillageStick, createVillagePadState, createVillageRepeat, villageControllerLegendHTML } from "../src/ui/village-controls.js";

const dualSense = () => ({ id: "DualSense Wireless Controller", index: 0, connected: true, mapping: "standard", axes: [0, 0, 0, 0], buttons: Array.from({ length: 18 }, () => ({ pressed: false, value: 0 })) });
const press = (pad, index, value = 1) => { pad.buttons[index] = { pressed: value > .5, value }; };

test("village sticks reject drift and invalid axes, preserve analogue strength and bound diagonals", () => {
  assert.deepEqual(normaliseVillageStick(.1, -.1), { x: 0, y: 0 });
  assert.deepEqual(normaliseVillageStick(NaN, undefined), { x: 0, y: 0 });
  assert.deepEqual(normaliseVillageStick(1, 0), { x: 1, y: 0 });
  assert.ok(Math.abs(normaliseVillageStick(.59, 0).x - .5) < 1e-10);
  const diagonal = normaliseVillageStick(1, -1);
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.y) - 1) < 1e-10);
  assert.ok(diagonal.x > 0 && diagonal.y < 0);
  assert.ok(Math.hypot(...Object.values(normaliseVillageStick(99, -99))) <= 1);
});

test("standard PS5 mapping keeps move, camera, R2 jogging and button edges independent", () => {
  const state = createVillagePadState(), pad = dualSense();
  assert.equal(state.sample([pad]).active, false, "connection alone does not claim input");
  pad.axes = [-.8, .6, .4, -.7]; press(pad, 0); press(pad, 7);
  const sample = state.sample([pad]);
  assert.ok(sample.move.x < 0 && sample.move.y > 0);
  assert.ok(sample.look.x > 0 && sample.look.y < 0);
  assert.equal(sample.sprint, true); assert.equal(sample.pad.pressed(0), true); assert.equal(sample.pad.pressed(1), false);
  assert.equal(state.sample([pad]).pad.pressed(0), false, "held Cross confirms only once");
  press(pad, 0, 0); state.sample([pad]); press(pad, 0); assert.equal(state.sample([pad]).pad.pressed(0), true);
});

test("disconnect releases movement and reconnect needs neutral sticks and released buttons", () => {
  const state = createVillagePadState(), pad = dualSense(); state.sample([pad]);
  pad.axes[1] = -1; press(pad, 0); assert.equal(state.sample([pad]).move.y, -1);
  const lost = state.sample([]); assert.equal(lost.disconnected, true); assert.equal(lost.pad, null); assert.deepEqual(lost.move, { x: 0, y: 0 });
  const again = state.sample([pad]); assert.deepEqual(again.move, { x: 0, y: 0 }); assert.equal(again.pad.pressed(0), false);
  pad.axes[1] = 0; press(pad, 0, 0); state.sample([pad]);
  pad.axes[1] = -1; press(pad, 0); const fresh = state.sample([pad]); assert.equal(fresh.move.y, -1); assert.equal(fresh.pad.pressed(0), true);
});

test("release on a panel, blur or input handover cannot leak a held action into the next view", () => {
  const state = createVillagePadState(), pad = dualSense(); state.sample([pad]);
  pad.axes = [1, 0, 0, -1]; press(pad, 7); state.sample([pad]); state.release();
  const released = state.sample([pad]); assert.deepEqual(released.move, { x: 0, y: 0 }); assert.deepEqual(released.look, { x: 0, y: 0 }); assert.equal(released.sprint, false);
  pad.axes[0] = 0; state.sample([pad]); pad.axes[0] = .7;
  assert.ok(state.sample([pad]).move.x > 0, "left stick can rearm without waiting for the right stick");
  assert.equal(state.sample([pad]).look.y, 0);
});

test("a second active controller can take over without inheriting held confirm", () => {
  const state = createVillagePadState(), first = dualSense(), second = dualSense(); second.index = 1;
  state.sample([first, second]); press(second, 0); const switched = state.sample([first, second]);
  assert.equal(switched.pad.g.index, 1); assert.equal(switched.pad.pressed(0), false);
  press(second, 0, 0); state.sample([first, second]); press(second, 0); assert.equal(state.sample([first, second]).pad.pressed(0), true);
});

test("menu repeat has one first step, a deliberate delay, and frame-independent repeats", () => {
  const repeat = createVillageRepeat();
  assert.equal(repeat.step("down", 0), true); assert.equal(repeat.step("down", 359), false);
  assert.equal(repeat.step("down", 360), true); assert.equal(repeat.step("down", 489), false); assert.equal(repeat.step("down", 490), true);
  assert.equal(repeat.step("down", 3000), true, "a slow frame produces one step, not a backlog");
  assert.equal(repeat.step("right", 3001), true); assert.equal(repeat.step("", 3002), false); assert.equal(repeat.step("right", 3003), true);
  repeat.clear(); assert.equal(repeat.step("right", 3004), true);
});

test("the village legend keeps Quest and Menus together and separates the optional jogging hint", () => {
  const html = villageControllerLegendHTML();
  assert.match(html, /class="vg-legend-shortcuts"><span class="vg-pad-world vg-legend-control vg-legend-quest"/);
  assert.match(html, /vg-legend-quest" aria-label="D-pad up: Expand or collapse your followed quest"/);
  assert.match(html, /vg-legend-menus" aria-label="Options: Open village menus"/);
  const questClasses = html.match(/class="([^"]*vg-legend-quest)"/)[1];
  assert.equal(questClasses.includes("vg-pad-extra"), false, "the Fold may hide Jog without hiding Quest");
  assert.equal(questClasses.includes("vg-pad-motion"), false, "a short screen may hide movement hints without hiding Quest");
  assert.match(html, /vg-pad-world vg-pad-extra vg-legend-jog/);
  assert.match(html, /data-ps5-icon="up"/); assert.match(html, /data-ps5-icon="options"/);
});

test("menu legend explicitly names D-pad navigation beside selection and back", () => {
  const html = villageControllerLegendHTML();
  assert.match(html, /class="vg-legend-primary"><span class="vg-pad-menu vg-legend-control vg-legend-navigate"/);
  assert.match(html, /aria-label="D-pad: Navigate menu choices"/);
  assert.match(html, /data-ps5-icon="dpad"/); assert.match(html, /<em>Navigate<\/em>/);
  assert.match(html, /class="vg-legend-action"/); assert.match(html, /data-ps5-icon="cross"/);
  assert.match(html, /vg-legend-back/); assert.match(html, /data-ps5-icon="circle"/);
});
