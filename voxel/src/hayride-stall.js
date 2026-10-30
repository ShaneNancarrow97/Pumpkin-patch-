// The breakdown (the "Hollow Man" scare): deep in the wood the tractor dies.
// The lamps go out and something walks round the wagon in the dark; the
// engine won't catch; then the headlamp bursts on with the Hollow Man in it,
// the engine roars, and he chases the wagon into the night.
// hayride-view.js keeps the clock (t, seconds since the tractor stopped) and
// holds the wagon still for STALL.hold seconds; hayride-world.js lights the
// lane by stallLamps(t) and stands him where hollowManPlace(t) says.
import * as THREE from "three";
import { shape, joint } from "./hayride-spiders.js";

export const STALL = Object.freeze({
  id: "hollow-man",
  hold: 9.6,          // seconds the wagon stands still
  reveal: 8.4,        // the headlamp bursts on with him in it
  side: 2.5,          // he's revealed this far to the inner side of the lane's middle (where the scenes stand), on the verge...
  ahead: 1.6,         // ...beside the tractor's front wheel, looming over it; the wagon passes him at arm's length
  chase: 16,          // he chases the wagon until it's this many units past him,
  gone: 26,           // ...and howls after it until it's this far past, then he's lost in the dark
  calm: 17.5,         // the tension has eased by this time
});
// What happens when: each cue fires once a ride, as the clock passes it.
export const STALL_CUES = Object.freeze([
  { t: -2.4, id: "stall-sputter", sound: "sputter" },      // the engine coughs, the lamps fail
  { t: 0, id: "stall-dead", sound: "stall" },              // it dies, and the wheels' rattle stops
  { t: 1.5, id: "stall-steps", sound: "steps" },           // footsteps in the leaves, circling
  { t: 3.8, id: "stall-breath", sound: "breath" },         // breathing, close behind
  { t: 5.6, id: "stall-ignition-1", sound: "ignition" },   // the starter turns over, and fails
  { t: 6.9, id: "stall-ignition-2", sound: "ignition" },
  { t: STALL.reveal, id: "stall-reveal", sound: "hollow", encounter: true },
  { t: 8.6, id: "stall-ignition-3", sound: "crank" },      // with him in the light, the starter turns once more...
  { t: STALL.hold, id: "stall-roar", sound: "roar" },      // ...and the engine catches
  { t: 11.6, id: "stall-chase", sound: "chase" },          // he runs
  { t: 15.4, id: "stall-howl", sound: "howl" },            // and howls as the wagon gets away
]);
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
// brown-out flickers as the starter turns. He's revealed by his own face, a
// jack-o'-lantern catching light (hollowManPlace); the headlamp bursts back
// on only as the engine catches. Null outside the breakdown. Never more than
// two flashes a second.
export function stallLamps(t) {
  if (t === null || !Number.isFinite(t) || t < -3 || t > 13) return null;
  if (t < 0) { const u = (t + 3) / 3, wobble = .5 + .5 * Math.sin(t * 12.1) * Math.sin(t * 4.7 + 1); return { head: (1 - .8 * u) * (.55 + .45 * wobble), wagon: (1 - .85 * u) * (.6 + .4 * wobble), lanterns: 1 - .9 * u, glow: 1 - u, sky: 1 - .94 * u, dark: u }; }
  if (t < STALL.hold) {
    const head = t >= 5.95 && t < 6.15 ? .16 : t >= 7.15 && t < 7.45 ? .26 : 0;
    return { head, wagon: 0, lanterns: 0, glow: 0, sky: .06, dark: 1 };
  }
  const u = smooth(STALL.hold, 13, t);
  return { head: 1.75 - .75 * u, wagon: .9 + .1 * u, lanterns: u, glow: u, sky: .06 + .94 * u, dark: 1 - u };
}
// The tractor's engine (ui/tractor-engine.js plays it), from the wagon's pace
// (1 its usual speed, 0 standing still) and the breakdown's clock (null
// without one): { fire: firings a second, level: 0 to about 1.4, rough: the
// share of firings that miss }. It idles at 27 firings a second and revs to
// about 37. Through the breakdown it coughs as the wagon slows, chugs down
// and dies; the starter turns it over twice and each time it fires once and
// dies again; the third time, with him in the headlamp, it catches with a
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
// (stop, units along the route) and where the rider is now (rider, units).
// Once the wagon moves again he's placed by how far it has gone past him,
// not by the clock, so the chase reads at any speed.
// mode: stalk (walking the trees), lurk, reveal, reach, run or howl; k runs
// 0 to 1 through the mode; glow is his face's brightness and light his
// ember-red fill light's; face is what he turns to: the rider, or the way he
// runs; gaze is how hard the ride's camera turns to him (0 to 1): into the
// beam as he's revealed, round as the wagon passes him, back over your
// shoulder as he gives chase, and ahead again as he falls behind.
export function hollowManPlace(t, stop, rider) {
  if (t === null || !Number.isFinite(t) || t < 1.4) return null;
  if (t < 5.8) return { along: stop - 8 + (t - 1.4) / 4.4 * 14, side: 6.6, mode: "stalk", k: (t - 1.4) / 4.4, glow: .12, light: 0, face: "rider", gaze: 0 };
  if (t < 7) return null;
  if (t < STALL.reveal) return { along: stop + 13, side: .2, mode: "lurk", k: (t - 7) / 1.4, glow: .2, light: 0, face: "rider", gaze: 0 };
  const spot = stop + STALL.ahead, passed = rider - spot;
  if (t < STALL.hold) {
    // The reveal: in the dark beside the tractor his face catches light, a flare as the flame takes inside the pumpkin, then a steady blaze.
    const lit = smooth(STALL.reveal, STALL.reveal + .15, t), flare = Math.exp(-(t - STALL.reveal) / .5);
    return { along: spot, side: STALL.side, mode: "reveal", k: smooth(STALL.reveal, STALL.reveal + .3, t), glow: .2 + lit * (1.3 + .9 * flare), light: lit * (1 + .6 * flare), face: "rider", gaze: smooth(STALL.reveal - .1, STALL.reveal + .25, t) };
  }
  if (passed < -.2) return { along: spot, side: STALL.side, mode: "reach", k: Math.min(1, (t - STALL.hold) / 1.5), glow: 1.3, light: .85, face: "rider", gaze: 1 };
  if (passed < STALL.chase) {
    const u = Math.max(0, passed) / STALL.chase, into = smooth(0, .35, u);
    return { along: rider - 1.2 - Math.max(0, passed) * .55, side: STALL.side * (1 - into) + .3 * into, mode: "run", k: u, glow: 1.2, light: .7, face: "forward", gaze: 1 };
  }
  if (passed < STALL.gone) {
    const u = (passed - STALL.chase) / (STALL.gone - STALL.chase);
    return { along: spot + STALL.chase - 1.2 - STALL.chase * .55, side: .3, mode: "howl", k: u, glow: 1.1 - .8 * u, light: .6 * (1 - u), face: "rider", gaze: 1 - smooth(.25, .85, u) };
  }
  return null;
}

// ---- The Hollow Man ----
// A gaunt figure three units tall in a long ragged coat, straw at his collar
// and cuffs, arms to his knees ending in twig fingers, and for a head a
// carved pumpkin under a burlap hood, its face burning. Rig frame: +z is the
// way he faces, y 0 his soles. One draw for his body and one for his face.
const C = {
  coat: 0x16121a, coat2: 0x221a25, trousers: 0x1b1820, boot: 0x100d10, straw: 0xb08f52, straw2: 0x8e6f3a,
  twig: 0x2c1d15, pumpkin: 0xb3521d, rib: 0x873a12, stem: 0x3e4a22, hood: 0x3a2c22, hood2: 0x2b2019, fire: 0xffa53a, hot: 0xffe28a,
};
const UNIT = new THREE.BoxGeometry(1, 1, 1);
export function createHollowMan() {
  const root = new THREE.Object3D(), shapes = [];
  const hips = joint(root, 0, 1.64, 0);
  const legs = [-1, 1].map((s) => {
    const thigh = joint(hips, s * .15, 0, 0);
    shape(thigh, shapes, 0, -.42, 0, .17, .86, .2, C.trousers);
    shape(thigh, shapes, s * .02, -.3, .06, .1, .14, .06, C.coat2);                  // a patch
    const knee = joint(thigh, 0, -.84, 0);
    shape(knee, shapes, 0, -.39, 0, .15, .8, .17, C.trousers);
    for (let i = 0; i < 3; i++) shape(knee, shapes, (i - 1) * .05, -.66 - (i % 2) * .05, 0, .05, .1, .19, C.coat2);   // frayed cuffs
    shape(knee, shapes, 0, -.79, .07, .2, .12, .36, C.boot);
    return { thigh, knee };
  });
  const spine = joint(hips, 0, .04, 0);
  shape(spine, shapes, 0, .44, 0, .5, .9, .3, C.coat);
  shape(spine, shapes, 0, .46, .152, .08, .82, .01, C.coat2);                             // the coat's front edge
  // The coat's ragged tails, longer at the back, swinging as he moves.
  const tails = [];
  for (let i = 0; i < 8; i++) {
    const x = -.28 + i * .08, len = .62 + ((i * 37) % 5) * .1, tail = joint(spine, x, .02, -.13 + (i % 2) * .015);
    shape(tail, shapes, 0, -len / 2, 0, .075, len, .035, i % 2 ? C.coat : C.coat2); tails.push(tail);
  }
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
    const len = .5 + i * .14, tail = joint(spine, s * .26, .02, -.06 + i * .07);
    shape(tail, shapes, 0, -len / 2, 0, .035, len, .07, C.coat2); tails.push(tail);
  }
  const chest = joint(spine, 0, .82, 0);
  shape(chest, shapes, 0, .02, 0, .8, .22, .34, C.coat);                                  // hunched shoulders
  for (let i = 0; i < 7; i++) shape(chest, shapes, -.33 + i * .11, .15 + (i % 3) * .03, .1 - (i % 2) * .21, .045, .2, .045, i % 2 ? C.straw : C.straw2);
  const arms = [-1, 1].map((s) => {
    const shoulder = joint(chest, s * .44, 0, 0);
    shape(shoulder, shapes, 0, -.4, 0, .16, .82, .17, C.coat);
    const elbow = joint(shoulder, 0, -.8, 0);
    shape(elbow, shapes, 0, -.37, 0, .13, .76, .14, C.coat2);
    for (let i = 0; i < 4; i++) shape(elbow, shapes, (i - 1.5) * .045, -.76, (i % 2) * .04 - .02, .04, .14, .04, i % 2 ? C.straw : C.straw2);   // straw at the cuff
    const wrist = joint(elbow, 0, -.8, 0);
    const fingers = [-1.5, -.5, .5, 1.5].map((k) => {
      const f = joint(wrist, k * .045, 0, .01);
      shape(f, shapes, 0, -.18, 0, .034, .36, .034, C.twig);
      const tip = joint(f, 0, -.35, 0);
      shape(tip, shapes, 0, -.13, 0, .026, .26, .026, C.twig);
      return { f, tip, k };
    });
    return { shoulder, elbow, wrist, fingers };
  });
  const neck = joint(chest, 0, .12, .03);
  shape(neck, shapes, 0, .08, 0, .13, .2, .13, C.straw2);
  const head = joint(neck, 0, .18, 0);
  // The pumpkin: ribs as overlapping blocks, a stem through the hood.
  shape(head, shapes, 0, .3, 0, .62, .52, .56, C.pumpkin);
  shape(head, shapes, 0, .3, 0, .48, .58, .62, C.rib);
  shape(head, shapes, 0, .3, 0, .7, .44, .44, C.rib);
  shape(head, shapes, .03, .63, -.04, .07, .16, .07, C.stem);
  // The burlap hood over his crown and the back of his head, ragged at the hem.
  shape(head, shapes, 0, .52, -.1, .78, .42, .56, C.hood);
  for (const s of [-1, 1]) shape(head, shapes, s * .37, .28, -.05, .06, .52, .48, C.hood);
  for (let i = 0; i < 6; i++) shape(head, shapes, -.33 + i * .13, .27 - (i % 2) * .06, -.36, .1, .16 + (i % 3) * .05, .04, i % 2 ? C.hood : C.hood2);
  // The carved face, burning: stepped triangle eyes, a nose and a jagged grin.
  const glow = (x, y, w, h, hot = false) => shape(head, shapes, x, y, .318, w, h, .02, hot ? C.hot : C.fire, true);
  for (const s of [-1, 1]) { glow(s * .14, .39, .13, .045, true); glow(s * .14, .435, .085, .045); glow(s * .14 + s * .01, .475, .04, .04); }
  glow(0, .31, .05, .05);
  for (let i = 0; i < 7; i++) glow(-.21 + i * .07, .19 + (i % 2 ? .025 : -.005), .062, .055 + (i % 2) * .035, i === 3);

  // Two instanced draws: his body, and his face, whose brightness changes.
  const solid = shapes.filter((s) => !s.glow), fire = shapes.filter((s) => s.glow);
  const material = new THREE.MeshStandardMaterial({ roughness: .92, metalness: 0 }), flame = new THREE.MeshBasicMaterial({ toneMapped: false });
  const body = new THREE.InstancedMesh(UNIT, material, solid.length), face = new THREE.InstancedMesh(UNIT, flame, fire.length), colour = new THREE.Color();
  solid.forEach((s, i) => body.setColorAt(i, colour.setHex(s.colour)));
  for (const m of [body, face]) { m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.castShadow = false; }
  const group = new THREE.Group(); group.name = "The Hollow Man"; group.add(body, face); group.visible = false;
  let shownGlow = -1;
  const rig = { root, hips, spine, chest, neck, head, legs, arms, tails };
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

// His poses. time drives the idle twitches and the gait; k runs through the mode.
export function poseHollowMan(rig, time, mode = "lurk", k = 0) {
  const { hips, spine, chest, neck, head, legs, arms, tails } = rig;
  const sway = Math.sin(time * 1.3), tilt = Math.sin(time * .7) * .2;
  // Standing hunched by default: leaning in, head cocked, fingers twitching.
  hips.position.y = 1.64; hips.rotation.set(0, 0, 0);
  spine.rotation.set(.28, 0, sway * .03); chest.rotation.set(.16, 0, 0); neck.rotation.set(.12, 0, 0); head.rotation.set(0, 0, tilt);
  legs.forEach(({ thigh, knee }, i) => { thigh.rotation.set(-.04, 0, (i ? 1 : -1) * .05); knee.rotation.set(.1, 0, 0); });
  arms.forEach(({ shoulder, elbow, wrist, fingers }, i) => {
    const s = i ? 1 : -1;
    shoulder.rotation.set(-.08 + Math.sin(time * 1.1 + i) * .04, 0, s * .1); elbow.rotation.set(-.12, 0, 0); wrist.rotation.set(0, 0, 0);
    fingers.forEach(({ f, tip, k: n }) => { f.rotation.set(.35 + Math.sin(time * 3.1 + n * 1.7 + i) * .14, 0, n * .1); tip.rotation.set(.45, 0, 0); });
  });
  tails.forEach((t, i) => t.rotation.set(.04 + Math.sin(time * 1.7 + i) * .04, 0, 0));   // positive x swings a tail back
  if (mode === "stalk") {
    // A slow, long-legged prowl between the trees.
    const p = time * 3.1;
    legs.forEach(({ thigh, knee }, i) => { const q = p + i * Math.PI; thigh.rotation.x = -Math.sin(q) * .45; knee.rotation.x = .25 + Math.max(0, Math.sin(q + 1.2)) * .7; });
    arms.forEach(({ shoulder }, i) => { shoulder.rotation.x = Math.sin(p + i * Math.PI) * .25; });
    hips.position.y = 1.64 - Math.abs(Math.sin(p)) * .05; spine.rotation.x = .38;
  } else if (mode === "lurk") {
    // Quite still at the end of the beam, head tipping slowly to one side.
    head.rotation.z = .35 + Math.sin(time * .5) * .08; neck.rotation.x = .2;
  } else if (mode === "reveal") {
    // Caught in the light: he rears up, arms flung wide and high, fingers splayed, head jerking forward.
    const r = k;
    spine.rotation.x = .28 - .45 * r; chest.rotation.x = .16 - .2 * r; neck.rotation.x = .12 + .35 * r; head.rotation.z = tilt * (1 - r) + Math.sin(time * 9) * .05 * r;
    arms.forEach(({ shoulder, elbow, fingers }, i) => {
      const s = i ? 1 : -1;
      shoulder.rotation.set(-.55 * r, 0, s * (.1 + 2.05 * r)); elbow.rotation.x = -.35 * r;
      fingers.forEach(({ f, tip, k: n }) => { f.rotation.set(.1 - .2 * r, 0, n * (.1 + .32 * r)); tip.rotation.x = .2 + Math.sin(time * 11 + n) * .1; });
    });
    legs.forEach(({ thigh, knee }, i) => { thigh.rotation.z = (i ? 1 : -1) * (.05 + .14 * r); knee.rotation.x = .1 + .1 * r; });
  } else if (mode === "reach") {
    // Lunging at the wagon as it goes by, both arms out to the lane.
    const r = Math.min(1, k * 3);
    spine.rotation.x = .2 + .45 * r; chest.rotation.x = .1 + .15 * r; neck.rotation.x = -.15 * r; head.rotation.z = tilt * .5;
    arms.forEach(({ shoulder, elbow, fingers }, i) => {
      shoulder.rotation.set(-1.15 - .35 * r + Math.sin(time * 6 + i * 2) * .18, 0, (i ? 1 : -1) * (.25 - .15 * r)); elbow.rotation.x = -.25;
      fingers.forEach(({ f, tip, k: n }) => { f.rotation.set(.15 + Math.sin(time * 14 + n + i) * .25, 0, n * .3); tip.rotation.x = .5; });
    });
    legs.forEach(({ thigh, knee }, i) => { thigh.rotation.x = i ? -.55 * r : .25 * r; knee.rotation.x = i ? .45 * r : .2; });
  } else if (mode === "run") {
    // A lurching, long-armed sprint after the wagon.
    const p = time * 8.2;
    legs.forEach(({ thigh, knee }, i) => { const q = p + i * Math.PI; thigh.rotation.x = -Math.sin(q) * .95; knee.rotation.x = .35 + Math.max(0, -Math.cos(q)) * 1.25; });
    arms.forEach(({ shoulder, elbow, fingers }, i) => {
      const q = p + i * Math.PI;
      shoulder.rotation.set(-.75 + Math.sin(q) * .75, 0, (i ? 1 : -1) * .22); elbow.rotation.x = -.5 - Math.max(0, Math.sin(q)) * .5;
      fingers.forEach(({ f }) => { f.rotation.x = .1; });
    });
    hips.position.y = 1.6 - Math.abs(Math.cos(p)) * .14; spine.rotation.x = .62; chest.rotation.x = .12; neck.rotation.x = -.3; head.rotation.z = Math.sin(p * .5) * .15;
    tails.forEach((t, i) => t.rotation.set(.6 + Math.sin(p + i) * .2, 0, 0));
  } else if (mode === "howl") {
    // Left behind in the dark: he stops, throws his head back and spreads his arms.
    const r = smooth(0, .25, k);
    spine.rotation.x = .28 - .5 * r; neck.rotation.x = .12 - .7 * r; head.rotation.z = Math.sin(time * 7) * .06 * r;
    arms.forEach(({ shoulder, elbow }, i) => { shoulder.rotation.set(-.3 * r, 0, (i ? 1 : -1) * (.1 + 1.3 * r)); elbow.rotation.x = -.2 * r; });
  }
}
