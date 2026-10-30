// The breakdown (the "Hollow Man" scare): deep in the wood the tractor dies
// and everything goes dark. Somewhere a music box starts up, and with each
// note his face flickers on in the dark, a jack-o'-lantern skulking round the
// tractor and the wagon, nearer each time you blink. The starter grinds and
// fails. The tune stops dead; pitch dark, only your heartbeat; and when you
// open your eyes he's crouched on the tractor's roof. He stretches over the
// wagon, his needle fingers sliding down its sides, until his face is in
// yours. Then the engine catches with a roar and he's after the wagon,
// frantic, until it gets away and he howls after it.
// hayride-view.js keeps the clock (t, seconds since the tractor stopped) and
// holds the wagon still for STALL.hold seconds; hayride-world.js lights the
// lane by stallLamps(t) and stands him where hollowManPlace(t) says;
// ui/hayride-ride-ui.js blinks by stallBlink(t).
import * as THREE from "three";
import { shape, joint } from "./hayride-spiders.js";
import { JINGLE, JINGLE_LENGTH } from "./content/hayride-jingle.js";
export { JINGLE };

export const STALL = Object.freeze({
  id: "hollow-man",
  hold: 18.6,         // seconds the wagon stands still
  jingle: 4.2,        // the music box starts; his face flickers on with each note as he skulks round the wagon
  hush: 4.2 + JINGLE_LENGTH,   // ...and stops dead: pitch dark, only the heartbeat
  climb: 15.2,        // he's crouched on the tractor's roof
  stretch: 16.2,      // he stretches over the wagon, his hands down its sides
  reveal: 17.4,       // his face, up in yours
  perch: .6,          // where he crouches: on the canopy, this far ahead of the tractor's place on the route...
  roof: 3.2,          // ...and this high
  bench: 5.5,         // the rider sits this far behind the tractor's place
  chase: 24,          // he chases until the rider is this many units on from where the wagon stood,
  gone: 36,           // ...and howls after it until this far, then he's lost in the dark
  calm: 30,           // the tension has eased by this time
});
// What happens when: each cue fires once a ride, as the clock passes it.
export const STALL_CUES = Object.freeze([
  { t: -2.4, id: "stall-sputter", sound: "sputter" },          // the engine coughs, the lamps fail
  { t: 0, id: "stall-dead", sound: "stall" },                  // it dies, and the wheels' rattle stops
  { t: 1.6, id: "stall-steps", sound: "steps" },               // footsteps in the leaves, circling
  { t: 3.2, id: "stall-breath", sound: "breath" },             // breathing, close behind
  { t: STALL.jingle, id: "stall-jingle", sound: "jingle" },    // a music box, somewhere in the dark
  { t: 6, id: "stall-ignition-1", sound: "ignition" },         // the starter turns over, and fails
  { t: 10.4, id: "stall-ignition-2", sound: "ignition" },
  { t: STALL.climb, id: "stall-climb", sound: "climb" },       // the canopy creaks under his weight
  { t: STALL.stretch, id: "stall-stretch", sound: "stretch" }, // his joints crack as he stretches
  { t: 16.6, id: "stall-ignition-3", sound: "crank" },         // the starter turns once more, under him...
  { t: STALL.reveal, id: "stall-reveal", sound: "hollow", encounter: true },
  { t: STALL.hold, id: "stall-roar", sound: "roar" },          // ...and the engine catches
  { t: 19.2, id: "stall-chase", sound: "chase" },              // he scrambles after the wagon
  { t: 23.6, id: "stall-chase-2", sound: "chase" },            // ...still coming
  { t: 30, id: "stall-howl", sound: "howl" },                  // and howls as it gets away
]);
// How lit his face is, u seconds into the tune: each note flares it, then it
// gutters, and now and then it stutters. Under three flickers a second.
export function jingleFlicker(u) {
  if (!(u >= 0) || u >= STALL.hush - STALL.jingle) return 0;
  let f = 0;
  for (const n of JINGLE) { if (n.t > u) break; f = Math.max(f, Math.exp(-(u - n.t) / .26)); }
  return f * (Math.sin(u * 41) * Math.sin(u * 17.3) > .55 ? .35 : 1);
}
// When the camera blinks (its eyelids shut, ui/hayride-ride-ui.js), and how
// shut they are at t, 0 to 1. While your eyes are shut he moves on: the long
// one in the hush is when he gets onto the roof, and the flinch as the engine
// roars is when he's flung off it, to land in the lane behind the wagon.
export const BLINKS = Object.freeze([{ t: 7.6, hold: .16 }, { t: 11, hold: .12 }, { t: 11.34, hold: .12 }, { t: 13.6, hold: .2 }, { t: 14.55, hold: .85 }, { t: 16.95, hold: .1 }, { t: STALL.hold - .06, hold: .4 }]);
export function stallBlink(t) {
  if (!Number.isFinite(t)) return 0;
  let shut = 0;
  for (const b of BLINKS) {
    const d = t - b.t;
    if (d > -.08 && d < b.hold + .14) shut = Math.max(shut, d < 0 ? 1 + d / .08 : d < b.hold ? 1 : 1 - (d - b.hold) / .14);
  }
  return Math.max(0, Math.min(1, shut));
}
// Where the tractor dies: in the deep wood between the bride's manor and the
// pursuit, a third of the way along, so the chase is over before the pursuit
// comes up. In units along the route.
export const STALL_SHARE = .35;
export function stallAlong(stops, length) {
  const a = stops.find((s) => s.id === "bride"), b = stops.find((s) => s.id === "pursuit");
  return a && b ? (a.at + (b.at - a.at) * STALL_SHARE) * length : .523 * length;
}

const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// The lamps through the breakdown, as shares of their usual brightness:
// failing as the engine coughs, then real dark (the moon all but gone, the
// fog and sky near black: dark is how far, 0 to 1), but for the headlamp's
// brown-out flickers as the starter turns. All the light he's seen by is his
// own face (hollowManPlace); the headlamp bursts back on only as the engine
// catches. Null outside the breakdown. Never more than two flashes a second.
export function stallLamps(t) {
  if (t === null || !Number.isFinite(t) || t < -3 || t > STALL.hold + 4) return null;
  if (t < 0) { const u = (t + 3) / 3, wobble = .5 + .5 * Math.sin(t * 12.1) * Math.sin(t * 4.7 + 1); return { head: (1 - .8 * u) * (.55 + .45 * wobble), wagon: (1 - .85 * u) * (.6 + .4 * wobble), lanterns: 1 - .9 * u, glow: 1 - u, sky: 1 - .94 * u, dark: u }; }
  if (t < STALL.hold) {
    const head = t >= 6.35 && t < 6.55 ? .16 : t >= 10.75 && t < 11.05 ? .26 : 0;
    return { head, wagon: 0, lanterns: 0, glow: 0, sky: .06, dark: 1 };
  }
  const u = smooth(STALL.hold, STALL.hold + 3.4, t);
  return { head: 1.75 - .75 * u, wagon: .9 + .1 * u, lanterns: u, glow: u, sky: .06 + .94 * u, dark: 1 - u };
}
// The tractor's engine (ui/tractor-engine.js plays it), from the wagon's pace
// (1 its usual speed, 0 standing still) and the breakdown's clock (null
// without one): { fire: firings a second, level: 0 to about 1.4, rough: the
// share of firings that miss }. It idles at 27 firings a second and revs to
// about 37. Through the breakdown it coughs as the wagon slows, chugs down
// and dies; the starter turns it over twice and each time it fires once and
// dies again; the third time, with him right in your face, it catches with a
// roar as the wagon lurches away.
export const ENGINE = Object.freeze({ idle: 27, rev: 6, crank: 5.5, die: 1.7, roar: 46 });
const CRANKS = STALL_CUES.filter((c) => c.sound === "ignition" || c.sound === "crank").map((c) => c.t);
export function engineAt(pace = 0, t = null) {
  const p = Math.max(0, Math.min(1.7, Number.isFinite(pace) ? pace : 0));
  const run = { fire: ENGINE.idle + ENGINE.rev * p, level: .75 + .2 * Math.min(1, p), rough: 0 };
  if (t === null || !Number.isFinite(t) || t < -2.4 || t > STALL.hold + 10) return run;
  if (t < 0) return { ...run, rough: .1 + .45 * (t + 2.4) / 2.4 };
  if (t < ENGINE.die) { const u = t / ENGINE.die; return { fire: 22 * (1 - u) ** 1.3, level: .85 * Math.sqrt(1 - u), rough: .45 }; }
  if (t >= STALL.hold) {
    const u = t - STALL.hold, surge = Math.exp(-u / 1.4), caught = 1 - Math.exp(-u / .12);
    return { fire: ENGINE.crank + (run.fire + (ENGINE.roar - run.fire) * surge - ENGINE.crank) * caught, level: .5 + (run.level + .45 * surge - .5) * caught, rough: .3 * Math.exp(-u / .6) };
  }
  for (const [i, start] of CRANKS.entries()) {
    const last = i === CRANKS.length - 1, from = start + (last ? .2 : .25), to = last ? STALL.hold : start + .95;
    if (t >= from && t < to) return { fire: ENGINE.crank, level: .5, rough: 0 };
    if (!last && t >= to && t < to + .25) { const u = (t - to) / .25; return { fire: 18 * (1 - .6 * u), level: .7 * (1 - u), rough: .35 }; }
  }
  return { fire: 0, level: 0, rough: 0 };
}


// Where he is and what he's doing at time t, from where the tractor stopped
// (stop, units along the route) and where the rider is now (rider, units):
// { along, side, y (his soles), mode, k (0 to 1 through the mode, or
// seconds), glow (his face's brightness), light (his face's light on what's
// round him), face (what he turns to), gaze (how hard the ride's camera
// turns to him, 0 to 1), perch (on the tractor's roof), reach (how far he
// has stretched to the rider, 0 to 1), open (how far his face has split
// open, 0 to 1), frantic and lunge (the chase) }.
// Once the wagon moves again he's placed by how far it has gone, not by the
// clock, so the chase reads at any speed.
// He skulks round the tractor and the wagon on a loop this size, a lap in
// this many seconds, and gets this much further round each time you blink.
const SKULK = Object.freeze({ centre: -2.4, along: 7.2, side: 3.2, lap: 9.5, jump: .07 });
function skulkAngle(t) {
  let laps = .02 + (t - STALL.jingle) / SKULK.lap;
  for (const b of BLINKS) if (b.t < STALL.hush && t > b.t + b.hold * .5) laps += SKULK.jump;
  return laps * Math.PI * 2;
}
export function hollowManPlace(t, stop, rider) {
  if (t === null || !Number.isFinite(t) || t < 1.4) return null;
  if (t < STALL.jingle) { const u = (t - 1.4) / (STALL.jingle - 1.4); return { along: stop - 9 + u * 12, side: 6.8, y: 0, mode: "stalk", k: u, glow: .08, light: 0, face: "rider", gaze: 0 }; }
  if (t < STALL.hush) {
    const a = skulkAngle(t), u = t - STALL.jingle, f = jingleFlicker(u);
    return { along: stop + SKULK.centre + Math.cos(a) * SKULK.along, side: Math.sin(a) * SKULK.side, y: 0, mode: "skulk", k: u, glow: .1 + 1.5 * f, light: .95 * f, face: "rider", gaze: .55 * smooth(0, .8, u) };
  }
  const roof = { along: stop + STALL.perch, side: 0, y: STALL.roof, face: "rider", perch: true };
  if (t < STALL.climb) return { ...roof, mode: "perch", k: 0, reach: 0, glow: 0, light: 0, gaze: 0 };
  if (t < STALL.stretch) { const k = (t - STALL.climb) / (STALL.stretch - STALL.climb), flick = .6 + .4 * Math.sin(t * 23) * Math.sin(t * 7.1); return { ...roof, mode: "perch", k, reach: 0, glow: (.15 + .9 * k) * flick, light: .55 * k * flick, gaze: smooth(0, .6, k) }; }
  if (t < STALL.reveal) { const k = smooth(STALL.stretch, STALL.reveal, t); return { ...roof, mode: "stretch", k, reach: k, glow: 1 + .6 * k, light: .7 + .5 * k, gaze: 1 }; }
  // In your face, his face splits open: five petals peel back on a maw of glowing red flesh and teeth.
  if (t < STALL.hold) { const flare = Math.exp(-(t - STALL.reveal) / .45); return { ...roof, mode: "face", k: t - STALL.reveal, reach: 1, open: smooth(STALL.reveal + .2, STALL.reveal + .6, t), glow: 1.7 + .9 * flare, light: 1.3 + .4 * flare, gaze: 1 }; }
  // The engine catches and the wagon lurches away. He's thrown off the roof
  // and scrambles after it, frantic: zig-zagging across the lane, lunging at
  // the rail every couple of seconds, until it pulls away from him.
  // At a lunge he dives at the rail face first, straight down the lane, but never nearer than two units.
  const passed = rider - (stop - STALL.bench), u = t - STALL.hold;
  if (passed < STALL.chase) {
    const lunge = Math.max(0, Math.sin(u * 3.7)) ** 6, behind = smooth(.6, 1, passed / STALL.chase) * 7;
    return { along: rider - (4.2 + .9 * Math.sin(u * 2.3) * (1 - lunge) - 2.2 * lunge + behind), side: (1.5 * Math.sin(u * 3.1) + .45 * Math.sin(u * 8.3)) * (1 - .7 * lunge), y: 0, mode: "run", k: u, lunge, open: smooth(.15, .7, lunge), glow: 1.25 + .45 * Math.sin(u * 19) * Math.sin(u * 7), light: .8, face: "rider", gaze: 1, frantic: true };
  }
  if (passed < STALL.gone) {
    const k = (passed - STALL.chase) / (STALL.gone - STALL.chase);
    return { along: stop - STALL.bench + STALL.chase - 11.2, side: .3, y: 0, mode: "howl", k, open: smooth(0, .3, k) * (1 - smooth(.7, 1, k)), glow: 1.1 - .8 * k, light: .6 * (1 - k), face: "rider", gaze: 1 - smooth(.25, .85, k) };
  }
  return null;
}

// ---- The Hollow Man ----
// A tall, spindly figure in a pinstriped tailcoat with a bat for a bow tie,
// limbs thin as rods that stretch further than they should, and fingers like
// needles; for a head a tall, cracked jack-o'-lantern with a stitched grin,
// lit from inside. Rig frame: +z is the way he faces, y 0 his soles. One
// draw for his body and one for his face. The torso, the neck and each arm
// hang their boxes on a skin joint that stretches (poseHollowMan) without
// stretching what hangs off its end.
const C = {
  coat: 0x121017, stripe: 0x4d4858, lapel: 0x1c1822, shirt: 0xd9d2c1, tie: 0x0b0a0e, bone: 0xd8d0bc, boneDark: 0x8e8573, knuckle: 0x3d3631,
  needle: 0x9a9da8, shoe: 0x0d0b0f, pumpkin: 0xbf5a1e, rib: 0x8c3c12, crack: 0x36160a, stem: 0x3b4824, stitch: 0x150d08, fire: 0xffa53a, hot: 0xffe28a,
  flesh: 0x7a0a12, fleshHi: 0xa51b26, fleshDeep: 0x3c0307, throat: 0x050103, tooth: 0xd6ccb4, toothOld: 0xb3a582,
};
const UNIT = new THREE.BoxGeometry(1, 1, 1);
const HIPS = 1.86, TORSO = .92, NECK = .34, UPPER = .78, FORE = .76;
export function createHollowMan() {
  const root = new THREE.Object3D(), shapes = [], S = (p, x, y, z, w, h, d, c, g = false) => shape(p, shapes, x, y, z, w, h, d, c, g);
  const pinstripes = (p, y, w, h, d) => { for (let x = -w / 2 + .03; x < w / 2 - .02; x += .05) { S(p, x, y, d / 2 + .003, .011, h - .004, .004, C.stripe); S(p, x, y, -d / 2 - .003, .011, h - .004, .004, C.stripe); } };
  const hips = joint(root, 0, HIPS, 0);
  // Long thin legs in pinstriped trousers, knobbly knees, spats, and pointed shoes whose toes curl up.
  const legs = [-1, 1].map((s) => {
    const thigh = joint(hips, s * .1, 0, 0);
    S(thigh, 0, -.45, 0, .085, .9, .09, C.coat); for (const x of [-.022, .022]) S(thigh, x, -.45, .046, .012, .88, .004, C.stripe);
    const knee = joint(thigh, 0, -.9, 0);
    S(knee, 0, 0, .006, .1, .07, .1, C.lapel);
    S(knee, 0, -.45, 0, .075, .9, .08, C.coat); for (const x of [-.02, .02]) S(knee, x, -.45, .041, .012, .86, .004, C.stripe);
    S(knee, 0, -.87, .02, .09, .05, .12, C.shirt);
    S(knee, 0, -.93, .08, .1, .06, .3, C.shoe); S(knee, 0, -.9, .24, .06, .05, .07, C.shoe); S(knee, 0, -.855, .28, .04, .05, .04, C.shoe); S(knee, 0, -.8, .27, .03, .045, .03, C.shoe);
    return { thigh, knee };
  });
  // The tailcoat: a waist you could ring with a finger, widening to bony shoulders, pinstriped front and back.
  const spine = joint(hips, 0, .02, 0), torso = joint(spine);
  for (let i = 0; i < 9; i++) {
    const u = i / 8, y = .05 + i * .102, w = .2 + u * u * .32 + u * .12, d = .15 + u * .1;
    S(torso, 0, y, 0, w, .104, d, C.coat); pinstripes(torso, y, w, .104, d);
  }
  S(torso, 0, .84, .128, .11, .1, .012, C.shirt); S(torso, 0, .77, .126, .06, .06, .012, C.shirt);
  for (const s of [-1, 1]) { S(torso, s * .085, .78, .131, .05, .24, .014, C.lapel); S(torso, s * .06, .66, .122, .04, .1, .014, C.lapel); }
  for (const y of [.58, .46, .34]) S(torso, 0, y, .112, .026, .026, .012, C.bone);
  // Two long pointed tails behind, and ragged strands at the hem.
  const tails = [-1, 1].map((s) => {
    const tail = joint(hips, s * .055, .16, -.085);
    for (let i = 0; i < 6; i++) { const w = .13 - i * .018; S(tail, 0, -.1 - i * .19, 0, w, .2, .02, C.coat); S(tail, 0, -.1 - i * .19, -.012, .01, .19, .004, C.stripe); }
    S(tail, s * -.01, -1.24, 0, .025, .12, .02, C.coat);
    return tail;
  });
  for (const [x, len] of [[-.09, .28], [-.04, .2], [.03, .34], [.08, .24], [-.12, .18], [.11, .3]]) S(hips, x, -.02 - len / 2, .07, .02, len, .015, C.coat);
  // Shoulders, a high collar, and a bat for a bow tie.
  const chest = joint(spine, 0, TORSO, 0);
  for (const s of [-1, 1]) S(chest, s * .3, .0, 0, .11, .07, .14, C.coat);
  S(chest, 0, .07, -.02, .2, .08, .16, C.coat);
  S(chest, 0, .02, .125, .045, .045, .03, C.tie);
  for (const s of [-1, 1]) {
    S(chest, s * .065, .03, .125, .07, .055, .025, C.tie); S(chest, s * .115, .05, .125, .05, .04, .02, C.tie); S(chest, s * .15, .035, .125, .03, .045, .02, C.tie);
    S(chest, s * .075, .0, .125, .02, .02, .02, C.tie); S(chest, s * .12, .015, .125, .02, .02, .02, C.tie);
  }
  // Arms like rods to the knee, white cuffs, and four needle fingers in three joints, and a thumb.
  const arms = [-1, 1].map((s) => {
    const shoulder = joint(chest, s * .33, -.02, 0), upper = joint(shoulder);
    S(upper, 0, -UPPER / 2, 0, .075, UPPER, .08, C.coat); S(upper, 0, -UPPER / 2, .041, .012, UPPER - .02, .004, C.stripe); S(upper, 0, -UPPER / 2, -.041, .012, UPPER - .02, .004, C.stripe);
    const elbow = joint(shoulder, 0, -UPPER, 0), fore = joint(elbow);
    S(fore, 0, -FORE / 2, 0, .066, FORE, .07, C.coat); S(fore, 0, -FORE / 2, .036, .011, FORE - .04, .004, C.stripe); S(fore, 0, -FORE + .03, 0, .085, .07, .085, C.shirt);
    const wrist = joint(elbow, 0, -FORE, 0);
    S(wrist, 0, -.06, 0, .1, .12, .035, C.bone); S(wrist, 0, -.02, 0, .072, .04, .045, C.boneDark);
    const fingers = [-1.5, -.5, .5, 1.5].map((k) => {
      const f = joint(wrist, k * .03, -.12, 0);
      S(f, 0, -.085, 0, .022, .17, .022, C.bone); S(f, 0, -.17, 0, .028, .02, .028, C.knuckle);
      const mid = joint(f, 0, -.17, 0);
      S(mid, 0, -.075, 0, .02, .15, .02, C.bone); S(mid, 0, -.15, 0, .025, .018, .025, C.knuckle);
      const tip = joint(mid, 0, -.15, 0);
      S(tip, 0, -.07, 0, .014, .14, .014, C.needle); S(tip, 0, -.16, 0, .008, .05, .008, C.needle);
      return { f, mid, tip, k };
    });
    const thumb = joint(wrist, s * -.06, -.05, .02); S(thumb, 0, -.07, 0, .02, .14, .02, C.bone); S(thumb, 0, -.165, 0, .013, .07, .013, C.needle);
    return { shoulder, upper, elbow, fore, wrist, fingers, thumb };
  });
  // A long neck of knobbled vertebrae.
  const neck = joint(chest, 0, .05, .02), neckSkin = joint(neck);
  for (let i = 0; i < 5; i++) { S(neckSkin, 0, .03 + i * .066, 0, .072, .045, .072, C.bone); S(neckSkin, 0, .06 + i * .066, 0, .056, .02, .056, C.boneDark); }
  // The pumpkin, tall and ribbed, with a curling stem. Its back half is whole; its face is five petals that
  // peel open like a flower (poseHollowMan's open) on a maw of deep red, glowing flesh ringed with teeth.
  const head = joint(neck, 0, NECK, 0);
  S(head, 0, .38, -.13, .6, .74, .32, C.pumpkin); S(head, 0, .38, -.13, .44, .8, .34, C.rib); S(head, 0, .38, -.12, .66, .66, .26, C.rib);
  for (const x of [-.26, -.13, 0, .13, .26]) S(head, x, .38, -.29, .025, .68, .02, C.rib);
  for (const s of [-1, 1]) { S(head, s * .335, .38, -.02, .02, .62, .2, C.rib); S(head, s * .31, .38, .14, .04, .66, .26, C.pumpkin); }
  S(head, 0, .755, .05, .56, .05, .5, C.pumpkin); S(head, 0, .005, .05, .56, .05, .5, C.rib);
  S(head, .02, .8, 0, .06, .1, .06, C.stem); S(head, .06, .87, 0, .05, .05, .05, C.stem); S(head, .11, .9, 0, .045, .04, .045, C.stem); S(head, .15, .87, 0, .04, .04, .04, C.stem); S(head, .165, .82, 0, .03, .04, .03, C.stem);
  // The maw: glowing flesh darkening in rings down to a black throat, and two rings of teeth round it.
  S(head, 0, .38, .12, .5, .62, .03, C.fleshHi, true); S(head, 0, .38, .126, .38, .48, .03, C.flesh, true); S(head, 0, .38, .132, .26, .33, .02, C.fleshDeep, true);
  S(head, 0, .38, .138, .14, .18, .02, C.throat);
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; S(head, Math.cos(a) * .19, .38 + Math.sin(a) * .23, .148, .035, .05, .04, i % 3 ? C.tooth : C.toothOld, true); }
  for (let i = 0; i < 8; i++) { const a = (i + .5) / 8 * Math.PI * 2; S(head, Math.cos(a) * .1, .38 + Math.sin(a) * .12, .152, .03, .04, .035, i % 2 ? C.tooth : C.toothOld, true); }
  // The petals: each hinged on the rim. Inside (in the petal's own frame, +y to the middle), flesh and a row of
  // teeth down each edge; outside, the face, as a fine grid of the pumpkin's skin and the carving's glow,
  // each voxel on the petal whose wedge it falls in (counter keeps them square to the face while it's shut).
  const CENTRE = .38, RIM = .33, HINGE = .19, petals = [];
  for (let i = 0; i < 5; i++) {
    const a = Math.PI / 2 + i * Math.PI * 2 / 5, hinge = joint(head, Math.cos(a) * RIM, CENTRE + Math.sin(a) * RIM, HINGE);
    hinge.rotation.z = a + Math.PI / 2;
    const opener = joint(hinge), counter = joint(opener); counter.rotation.z = -(a + Math.PI / 2);
    // ...in ridges, darkest at the hinge, and some of the teeth old and yellowed.
    for (let j = 0; j < 4; j++) { const y = .04 + j * .075, w = 2 * (RIM - y) * Math.tan(Math.PI / 5) * .9; S(opener, 0, y, -.03, w, .072, .025, [C.fleshDeep, C.flesh, C.fleshHi, C.flesh][j], true); for (const e of [-1, 1]) S(opener, e * w * .42, y, -.058, .03, .045, .05, (i + j) % 3 ? C.tooth : C.toothOld, true); }
    petals.push({ opener, counter, x: hinge.position.x, y: hinge.position.y });
  }
  const wedge = (x, y) => { const k = Math.round((Math.atan2(y - CENTRE, x) - Math.PI / 2) / (Math.PI * 2 / 5)); return petals[((k % 5) + 5) % 5]; };
  const carved = (x, y) => {
    for (const s of [-1, 1]) if (y >= .44 && y <= .66 && Math.abs(x - s * .155 - s * (y - .44) * .25) <= (.66 - y) * .42 + .012) return y < .52 ? C.hot : C.fire;   // slanted eyes
    if (y >= .34 && y <= .42 && Math.abs(x) <= (.42 - y) * .6 + .01) return C.fire;                                                              // the nose
    const top = .29 + .85 * x * x, tooth = [-.15, -.05, .05, .15].some((t) => Math.abs(x - t) < .022) && y > top - .045;
    if (Math.abs(x) <= .27 && y >= .17 + 1.15 * x * x && y <= top && !tooth) return Math.abs(x) < .06 ? C.hot : C.fire;                       // the grin, notched with teeth
    return null;
  };
  const crack = new Set(["-0.20,0.63", "-0.15,0.68", "0.20,0.13", "0.25,0.08", "0.05,0.68"]);
  for (let x = -.3; x <= .301; x += .05) for (let y = .03; y <= .731; y += .05) {
    if ((x / .32) ** 4 + ((y - CENTRE) / .37) ** 4 > 1) continue;
    const p = wedge(x, y), glowColour = carved(x, y), key = `${x.toFixed(2)},${y.toFixed(2)}`;
    S(p.counter, x - p.x, y - p.y, .29 - HINGE, .05, .05, .05, glowColour ?? (crack.has(key) ? C.crack : Math.abs(Math.abs(x) - .2) < .03 ? C.rib : C.pumpkin), !!glowColour);
  }
  // The grin sewn shut: stitches across it, and the thread between them.
  for (let i = 0; i < 7; i++) { const x = -.21 + i * .07, y = .245 + .9 * x * x, p = wedge(x, y); S(p.counter, x - p.x, y - p.y, .322 - HINGE, .012, .14, .012, C.stitch); if (i < 6) { const tx = x + .035, ty = .245 + .9 * tx * tx, q = wedge(tx, ty); S(q.counter, tx - q.x, ty - q.y, .323 - HINGE, .07, .01, .01, C.stitch); } }

  // Two instanced draws: his body, and his face, whose brightness changes.
  const solid = shapes.filter((s) => !s.glow), fire = shapes.filter((s) => s.glow);
  const material = new THREE.MeshStandardMaterial({ roughness: .9, metalness: 0 }), flame = new THREE.MeshBasicMaterial({ toneMapped: false });
  const body = new THREE.InstancedMesh(UNIT, material, solid.length), face = new THREE.InstancedMesh(UNIT, flame, fire.length), colour = new THREE.Color();
  solid.forEach((s, i) => body.setColorAt(i, colour.setHex(s.colour)));
  for (const m of [body, face]) { m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.castShadow = false; }
  const group = new THREE.Group(); group.name = "The Hollow Man"; group.add(body, face); group.visible = false;
  let shownGlow = -1;
  const rig = { root, hips, spine, torso, chest, neck, neckSkin, head, legs, arms, tails, petals };
  return {
    group, rig,
    // After posing: copy the joints out, and set the face's brightness.
    sync(glowLevel = 1) {
      root.updateMatrixWorld(true);
      solid.forEach((s, i) => body.setMatrixAt(i, s.o.matrixWorld)); fire.forEach((s, i) => face.setMatrixAt(i, s.o.matrixWorld));
      body.instanceMatrix.needsUpdate = face.instanceMatrix.needsUpdate = true;
      const g = Math.round(glowLevel * 40) / 40;
      if (g !== shownGlow) { shownGlow = g; fire.forEach((s, i) => face.setColorAt(i, colour.setHex(s.colour).multiplyScalar(g))); face.instanceColor.needsUpdate = true; }
    },
    dispose() { body.dispose(); face.dispose(); material.dispose(); flame.dispose(); },
  };
}

// Stretching him. The trunk: the spine aims from the hips at a world point,
// and the torso and neck lengthen together until his face is there, turned
// along the neck at whatever it reached for.
const aimV = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0), DOWN = new THREE.Vector3(0, -1, 0);
function stretchTrunk(rig, target) {
  rig.root.updateMatrixWorld(true);
  aimV.copy(target); rig.hips.worldToLocal(aimV); aimV.sub(rig.spine.position);
  const st = Math.max(1, (aimV.length() - .3) / (TORSO + .05 + NECK));
  rig.spine.quaternion.setFromUnitVectors(UP, aimV.normalize());
  rig.torso.scale.set(1, st, 1); rig.chest.position.set(0, TORSO * st, 0); rig.chest.rotation.set(0, 0, 0);
  rig.neckSkin.scale.set(1, st, 1); rig.neck.rotation.set(0, 0, 0); rig.head.position.set(0, NECK * st, 0);
  rig.head.rotation.set(-Math.PI / 2, 0, 0);
}
// An arm: aimed from the shoulder at a world point, upper arm and forearm lengthening together to reach it.
function reachArm(rig, arm, target) {
  rig.root.updateMatrixWorld(true);
  aimV.copy(target); rig.chest.worldToLocal(aimV); aimV.sub(arm.shoulder.position);
  const sa = Math.max(1, (aimV.length() - .3) / (UPPER + FORE));
  arm.shoulder.quaternion.setFromUnitVectors(DOWN, aimV.normalize());
  arm.upper.scale.set(1, sa, 1); arm.elbow.position.set(0, -UPPER * sa, 0); arm.elbow.rotation.set(0, 0, 0);
  arm.fore.scale.set(1, sa, 1); arm.wrist.position.set(0, -FORE * sa, 0);
}

// His poses. time drives the twitches and the gaits; k runs through the
// mode. aim (world points) is where his hands grip and his face goes, on the
// roof: { hands: [left, right], head }; lunge (0 to 1) in the chase; and open
// (0 to 1), how far his face has split open.
export function poseHollowMan(rig, time, mode = "skulk", k = 0, aim = null) {
  const { hips, spine, torso, chest, neck, neckSkin, head, legs, arms, tails, petals } = rig;
  // His face's petals: shut, or peeled back (aim.open, 0 to 1) and writhing.
  const open = Math.max(0, Math.min(1, aim?.open ?? 0));
  petals.forEach((p, i) => { p.opener.rotation.x = open * (2.05 + .12 * Math.sin(time * 7 + i * 1.3)); });
  const sway = Math.sin(time * 1.3), tilt = Math.sin(time * .7) * .2, twitch = Math.sin(time * 23) * Math.sin(time * 5.3) * .06;
  // Standing tall, a little stooped, head cocked, needle fingers drumming.
  hips.position.set(0, HIPS, 0); hips.rotation.set(0, 0, 0);
  spine.rotation.set(.18, 0, sway * .03); torso.scale.set(1, 1, 1); chest.position.set(0, TORSO, 0); chest.rotation.set(.12, 0, 0);
  neck.rotation.set(.12, 0, 0); neckSkin.scale.set(1, 1, 1); head.position.set(0, NECK, 0); head.rotation.set(0, 0, tilt + twitch);
  legs.forEach(({ thigh, knee }, i) => { thigh.rotation.set(-.04, 0, (i ? 1 : -1) * .05); knee.rotation.set(.1, 0, 0); });
  arms.forEach((a, i) => {
    const s = i ? 1 : -1;
    a.shoulder.rotation.set(-.1 + Math.sin(time * 1.1 + i) * .05, 0, s * .12); a.upper.scale.set(1, 1, 1); a.elbow.position.set(0, -UPPER, 0); a.elbow.rotation.set(-.2, 0, 0);
    a.fore.scale.set(1, 1, 1); a.wrist.position.set(0, -FORE, 0); a.wrist.rotation.set(0, 0, 0); a.thumb.rotation.set(.3, 0, s * -.4);
    a.fingers.forEach(({ f, mid, tip, k: n }) => { f.rotation.set(.25 + Math.sin(time * 3.1 + n * 1.7 + i) * .18, 0, n * .09); mid.rotation.set(.3, 0, 0); tip.rotation.set(.25, 0, 0); });
  });
  tails.forEach((t, i) => t.rotation.set(.06 + Math.sin(time * 1.7 + i) * .05, 0, 0));   // positive x swings a tail back
  if (mode === "stalk") {
    // A slow, long-legged prowl between the trees.
    const p = time * 3.1;
    legs.forEach(({ thigh, knee }, i) => { const q = p + i * Math.PI; thigh.rotation.x = -Math.sin(q) * .45; knee.rotation.x = .25 + Math.max(0, Math.sin(q + 1.2)) * .7; });
    arms.forEach(({ shoulder }, i) => { shoulder.rotation.x = Math.sin(p + i * Math.PI) * .25; });
    hips.position.y = HIPS - Math.abs(Math.sin(p)) * .05; spine.rotation.x = .38;
  } else if (mode === "skulk" || mode === "perch") {
    // Folded low on long bent legs, creeping, needle fingers spread and tapping, head cocked at you.
    const creep = mode === "skulk" ? 1 : 0, p = time * 2.3 * creep;
    hips.position.y = HIPS - .66 + Math.abs(Math.sin(p)) * .04 * creep;
    legs.forEach(({ thigh, knee }, i) => { const q = p + i * Math.PI; thigh.rotation.set(-1.2 + Math.sin(q) * .22 * creep, 0, (i ? 1 : -1) * .2); knee.rotation.x = 1.85 - Math.max(0, Math.sin(q + .8)) * .3 * creep; });
    spine.rotation.x = .95; chest.rotation.x = .25; neck.rotation.x = -.85; head.rotation.set(-.15, Math.sin(time * .9) * .35, .35 * Math.sin(time * .6) + twitch * 2);
    arms.forEach((a, i) => {
      const q = p + i * Math.PI; a.shoulder.rotation.set(-1.05 + Math.sin(q) * .3 * creep, 0, (i ? 1 : -1) * .22); a.elbow.rotation.x = -.5;
      a.fingers.forEach(({ f, mid, tip, k: n }) => { f.rotation.set(.1 + Math.max(0, Math.sin(time * 6 + n * 1.3 + i)) * .5, 0, n * .22); mid.rotation.x = .25; tip.rotation.x = .2; });
    });
    if (aim?.hands) arms.forEach((a, i) => reachArm(rig, a, aim.hands[i]));
  } else if (mode === "stretch" || mode === "face") {
    // Crouched on the roof he stretches, spine and neck lengthening until his face is in yours, his arms out down the wagon's sides.
    hips.position.y = HIPS - .7;
    legs.forEach(({ thigh, knee }, i) => { thigh.rotation.set(-1.3, 0, (i ? 1 : -1) * .3); knee.rotation.x = 2; });
    if (aim?.head) stretchTrunk(rig, aim.head);
    if (aim?.hands) arms.forEach((a, i) => reachArm(rig, a, aim.hands[i]));
    arms.forEach((a, i) => a.fingers.forEach(({ f, mid, tip, k: n }) => { f.rotation.set(.9 + Math.sin(time * 14 + n + i) * .15, 0, n * .12); mid.rotation.x = 1; tip.rotation.x = .7; }));
    if (mode === "face") { head.rotation.y = Math.sin(time * 9) * .12; head.rotation.z = Math.sin(time * 13) * .1 + twitch * 2; }
  } else if (mode === "run") {
    // A frantic scramble after the wagon, half on all fours: legs pumping, arms clawing at the lane like
    // front legs, head jerking; at a lunge he springs off both feet and dives face first at the rail, his
    // head level with yours and his arms flung wide, fingers splayed.
    const p = time * 11.5, l = aim?.lunge ?? 0, run = 1 - l;
    hips.position.y = HIPS - .12 - Math.abs(Math.cos(p)) * .1 * run + .06 * l;
    legs.forEach(({ thigh, knee }, i) => { const q = p + i * Math.PI; thigh.rotation.set((-.45 - Math.sin(q) * 1.0) * run + .45 * l, 0, (i ? 1 : -1) * .1); knee.rotation.x = (.95 + Math.max(0, -Math.cos(q)) * 1.3) * run + .3 * l; });
    spine.rotation.x = 1.15 + .12 * l + Math.sin(p * 2) * .06 * run; chest.rotation.x = .1; neck.rotation.x = -1.05 - .12 * l;
    head.rotation.set(-.1 + Math.sin(time * 17) * .12 * run, (Math.sin(time * 7.7) * .35 + Math.sin(time * 23) * .1) * (1 - .7 * l), Math.sin(time * 13) * .28 * (1 - .6 * l));
    arms.forEach((a, i) => {
      const q = p + i * Math.PI + .6;
      a.shoulder.rotation.set((-1.25 + Math.sin(q) * 1.15) * run - 2.05 * l, 0, (i ? 1 : -1) * (.25 + Math.abs(Math.sin(q)) * .25 * run + .5 * l)); a.elbow.rotation.x = (-.35 - Math.max(0, Math.sin(q)) * .7) * run - .45 * l;
      a.fingers.forEach(({ f, mid, tip, k: n }) => { f.rotation.set((.5 + Math.sin(time * 19 + n) * .4) * run + .1 * l, 0, n * (.2 + .3 * l)); mid.rotation.x = .6 - .4 * l; tip.rotation.x = .5 - .3 * l; });
    });
    tails.forEach((t, i) => t.rotation.set(1 + Math.sin(p + i) * .35, 0, Math.sin(p * .5 + i) * .2));
  } else if (mode === "howl") {
    // Left behind in the dark: he stops, throws his head back and spreads his arms.
    const r = smooth(0, .25, k);
    spine.rotation.x = .18 - .45 * r; neck.rotation.x = .12 - .8 * r; head.rotation.z = Math.sin(time * 7) * .06 * r;
    arms.forEach(({ shoulder, elbow }, i) => { shoulder.rotation.set(-.3 * r, 0, (i ? 1 : -1) * (.12 + 1.35 * r)); elbow.rotation.x = -.2 * r; });
  }
}
