// The guests' carving stand on the farm (rules/carving-stand.js), beside the
// Hollow House on the open ground between its west wall, the back fence and
// the lantern path the maze guests walk. A timber pavilion
// (carving-stand-models.js): a lantern wall showing every design (lit once
// it's on the menu), a shingled hood with the sign and a great lantern on
// its gable, and a long bench where guests sit and carve. Each guest's
// lantern goes from a whole pumpkin to lid off, carved and lit as they work.
// Hidden until built; the pavilion rebuilds only when its benches, menu or
// extras change, and a guest's lantern only when its stage does.
import * as THREE from "three";
import { buildStandBody, lanternModel, chalkboard, GLOW } from "./carving-stand-models.js";
import { STAND_DESIGN_BY_ID, STAND_EXTRA_BY_ID, carvingStage, standValue } from "./rules/carving-stand.js";

export const STAND_SITE = Object.freeze({ x: -2.7, z: 6.3, w: 7.2, d: 4.4 });

// Drops what a build made, but never the voxels' shared cube or a kept template.
function release(object) {
  object.traverse((o) => {
    if (!o.isMesh || o.userData.template) return;
    for (const m of [].concat(o.material)) { m.map?.dispose(); m.dispose(); }
    if (!o.isInstancedMesh) o.geometry.dispose();
  });
}

export function createCarvingStandWorld({ scene, state, signBoard, pickables, lamps = [], seatedVisitor = null, animate = null }) {
  const root = new THREE.Group(); root.name = "The Carving Stand"; root.visible = false; root.position.set(STAND_SITE.x, 0, STAND_SITE.z); scene.add(root);
  const hit = new THREE.Mesh(new THREE.BoxGeometry(STAND_SITE.w, 3.6, STAND_SITE.d), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.y = 1.8; hit.userData = { type: "carving-stand" }; root.add(hit); pickables.push(hit);
  let key = "", body = null, places = [], chalkKey = "", chalk = null, chalkAt = { x: 1.45, y: .1, z: 1.62 };
  const own = [];                                                     // lamp positions, lit while the stand is built
  const templates = new Map(), glows = new Set(), seats = new Map();

  // A lantern for a stage, built once and shared by every bench that shows it.
  function template(design, stage, extras) {
    const paint = extras.includes("paint") && stage === "lit", hat = extras.includes("hat") && stage === "lit", stand = extras.includes("stand") && stage === "lit";
    const id = `${design}:${stage}:${paint}:${hat}:${stand}`;
    if (!templates.has(id)) {
      const t = lanternModel(design, stage, paint ? GLOW.paint : GLOW.candle, hat, stand);
      t.traverse((o) => { if (!o.isMesh) return; o.userData.template = true; if (o.material.isMeshBasicMaterial) glows.add(o.material); });
      templates.set(id, t);
    }
    return templates.get(id);
  }
  function rebuild(c) {
    if (body) { root.remove(body); release(body); }
    const built = buildStandBody({ benches: standValue(state, "benches"), designs: c.designs, extras: c.extras });
    body = built.voxels.build({ detailShadows: false }); body.name = "Carving stand pavilion";
    const sign = signBoard("The Carving Stand", "carve your own lantern", built.sign.width); sign.position.set(built.sign.x, built.sign.y, built.sign.z); sign.userData = { type: "carving-stand" }; body.add(sign);
    root.add(body); places = built.places; chalkAt = built.chalk;
    if (!own.length) for (const l of built.lamps) { const lamp = { x: STAND_SITE.x + l.x, y: l.y, z: STAND_SITE.z + l.z, active: false }; own.push(lamp); lamps.push(lamp); }
    // Benches that went away take their guests with them.
    for (const [bench, seat] of seats) if (bench >= places.length) { clearSeat(seat); seats.delete(bench); }
    chalkKey = "";
  }
  // The chalkboard: tonight's designs and extras, with what they cost now.
  function writeChalk(c) {
    const sign = standValue(state, "sign"), next = `${c.designs.join()}|${c.extras.join()}|${sign}`;
    if (next === chalkKey) return; chalkKey = next;
    if (chalk) { root.remove(chalk); release(chalk); }
    const lines = [...c.designs.map((id) => [STAND_DESIGN_BY_ID[id].name, `£${Math.round(STAND_DESIGN_BY_ID[id].price * sign)}`]), ...c.extras.map((id) => [`+ ${STAND_EXTRA_BY_ID[id].name.toLowerCase()}`, `£${STAND_EXTRA_BY_ID[id].price}`, "#c8f0d8"])];
    chalk = chalkboard(lines); chalk.position.set(chalkAt.x, chalkAt.y, chalkAt.z); root.add(chalk);
  }
  function clearSeat(seat) {
    if (seat.guest) { root.remove(seat.guest); seat.guest.userData.dispose?.(); }
    if (seat.lantern) root.remove(seat.lantern);
  }

  return {
    get status() {
      return { built: !!state.carvingStand?.built, site: STAND_SITE, places: places.length, seats: [...seats].map(([bench, s]) => ({ bench, serial: s.serial, stage: s.stage, guest: !!s.guest })), boxes: (() => { let n = 0; root.traverse((o) => { if (o.isInstancedMesh) n += o.count; }); return n; })() };
    },
    sync(time = 0) {
      const c = state.carvingStand;
      root.visible = !!c?.built;
      for (const l of own) l.active = !!c?.built;
      if (!c?.built) return;
      const next = `${standValue(state, "benches")}|${c.designs.join()}|${c.extras.join()}`;
      if (next !== key) { key = next; rebuild(c); }
      writeChalk(c);
      // Each bench: the guest carving there, and their lantern at its stage.
      places.forEach((p, bench) => {
        const k = c.carvers.find((x) => x.bench === bench);
        let seat = seats.get(bench);
        if (!k) { if (seat) { clearSeat(seat); seats.delete(bench); } return; }
        if (seat && seat.serial !== k.serial) { clearSeat(seat); seats.delete(bench); seat = null; }
        if (!seat) {
          const guest = seatedVisitor?.(k.kind ?? 0) ?? null;
          if (guest) { guest.position.set(p.x - .12, .1, p.seat - .02); root.add(guest); }
          seat = { serial: k.serial, guest, stage: "", lantern: null }; seats.set(bench, seat);
        }
        const stage = carvingStage(k).id, extras = stage === "lit" ? k.extras ?? [] : [];
        if (stage !== seat.stage) {
          if (seat.lantern) root.remove(seat.lantern);
          seat.lantern = template(k.design, stage, extras).clone(); seat.lantern.position.set(p.x + .32, .83, p.table); root.add(seat.lantern); seat.stage = stage;
        }
        if (seat.guest) animate?.(seat.guest, time + bench * .7, false, 0, 0);
      });
      // Candlelight: the lit lanterns flicker a little, each template at its own pace.
      let n = 0; for (const m of glows) { m.color.setScalar(.9 + .1 * Math.sin(time * 9.3 + n * 1.7) * Math.sin(time * 5.1 + n)); n++; }
    },
  };
}
