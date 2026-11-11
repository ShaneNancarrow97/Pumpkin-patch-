// What moves inside a hall. A hall's builder leaves marks where things should stir, and this draws them:
//
//   fire      flames in a grate or a stove's mouth (the mark is the bed of the fire)
//   candle    one flame on a wick
//   steam     wisps rising from a pot, a kettle or a cup
//   motes     dust or moths drifting in the air round the mark (about 3 units wide, 2 tall)
//   sparkle   glints that come and go on gems, bottles or glass near the mark
//   pendulum  a brass rod and bob swinging under the mark (a clock, a hanging lamp, a mobile)
//
// Marks are in the hall's own frame, so the group is added to the hall's built group and shares its scale.
// Every kind is one instanced draw, however many marks ask for it; nothing here adds a light.
import * as THREE from "three";

const FLAMES = 10, WISPS = 5, MOTES = 22, GLINTS = 7;
const unit = new THREE.BoxGeometry(1, 1, 1);
const glow = (colour, opacity = 1) => new THREE.MeshBasicMaterial({ color: colour, toneMapped: false, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });
// A steady pseudo-random number for instance i (the same every frame, so nothing jumps about).
const rand = (i, salt = 0) => { const n = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453; return n - Math.floor(n); };

export const HALL_LIFE_KINDS = Object.freeze(["fire", "candle", "steam", "motes", "sparkle", "pendulum"]);

export function createHallLife(marks = {}) {
  const group = new THREE.Group(), dummy = new THREE.Object3D(); group.name = "hall-life";
  const list = (kind) => marks[kind] ?? [];
  const instanced = (count, material) => { const mesh = new THREE.InstancedMesh(unit, material, Math.max(1, count)); mesh.count = count; mesh.frustumCulled = false; mesh.castShadow = mesh.receiveShadow = false; group.add(mesh); return mesh; };
  const put = (mesh, i, x, y, z, w, h, d, turn = 0) => { dummy.position.set(x, y, z); dummy.scale.set(Math.max(.0001, w), Math.max(.0001, h), Math.max(.0001, d)); dummy.rotation.set(0, turn, 0); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); };

  const fires = list("fire"), candles = list("candle"), steams = list("steam"), dusts = list("motes"), gems = list("sparkle"), swings = list("pendulum");
  // Flames: an inner yellow core and outer orange tongues, each rising and thinning on its own beat.
  const core = instanced(fires.length * FLAMES + candles.length, glow(new THREE.Color(2.6, 2.0, .9)));
  const tongues = instanced(fires.length * FLAMES + candles.length, glow(new THREE.Color(2.4, .95, .25), .82));
  const embers = instanced(fires.length * 4, glow(new THREE.Color(2.2, .7, .2)));
  const wisps = instanced(steams.length * WISPS, glow(new THREE.Color(.95, .93, 1), .22));
  const motes = instanced(dusts.length * MOTES, glow(new THREE.Color(1.6, 1.35, .9), .7));
  const glints = instanced(gems.length * GLINTS, glow(new THREE.Color(2.2, 2.1, 2.4)));
  // Pendulums are few, so each is its own little pair of boxes on a pivot.
  const brass = new THREE.MeshLambertMaterial({ color: 0xc89a48 }), bobs = swings.map(([x, y, z], i) => {
    const pivot = new THREE.Group(); pivot.position.set(x, y, z);
    const rod = new THREE.Mesh(unit, brass); rod.scale.set(.035, .62, .035); rod.position.y = -.31;
    const bob = new THREE.Mesh(unit, brass); bob.scale.set(.2, .2, .07); bob.position.y = -.68;
    pivot.add(rod, bob); pivot.userData.phase = i * 1.7; group.add(pivot); return pivot;
  });

  function tick(time = 0, { still = false } = {}) {
    const t = still ? 0 : time;
    fires.forEach(([x, y, z], f) => {
      for (let k = 0; k < FLAMES; k++) {
        const i = f * FLAMES + k, speed = 1.1 + rand(i, 1) * 1.3, life = (t * speed + rand(i, 2)) % 1, across = (rand(i, 3) - .5) * .62, deep = (rand(i, 4) - .5) * .26;
        const sway = Math.sin(t * 5.3 + i * 2.1) * .04 * life, height = .16 + life * (.5 + rand(i, 5) * .34), girth = (1 - life) * (.2 + rand(i, 6) * .12);
        put(tongues, i, x + across * (1 - life * .5) + sway, y + height * .5, z + deep, girth, height, girth * .8, life * 2);
        put(core, i, x + across * .55 + sway * .5, y + height * .3, z + deep * .5, girth * .5, height * .6, girth * .45);
      }
      for (let k = 0; k < 4; k++) { const i = f * 4 + k, pulse = .6 + .4 * Math.sin(t * (2 + k * .7) + k * 1.9); put(embers, i, x + (k - 1.5) * .17, y + .03, z + (rand(i, 7) - .5) * .2, .15, .06 * pulse + .02, .13); }
    });
    candles.forEach(([x, y, z], c) => {
      const i = fires.length * FLAMES + c, flick = .82 + .18 * Math.sin(t * 9.1 + c * 3.3) * Math.sin(t * 5.7 + c), lean = Math.sin(t * 2.3 + c * 1.3) * .012;
      put(tongues, i, x + lean, y + .075 * flick, z, .055, .15 * flick, .055); put(core, i, x + lean * .5, y + .05 * flick, z, .03, .09 * flick, .03);
    });
    steams.forEach(([x, y, z], s) => {
      for (let k = 0; k < WISPS; k++) { const i = s * WISPS + k, life = (t * (.2 + rand(i, 8) * .12) + k / WISPS) % 1, wide = .07 + life * .2, fade = Math.sin(life * Math.PI); put(wisps, i, x + Math.sin(t * .9 + i * 1.7) * .1 * life, y + life * .85, z + Math.cos(t * .7 + i) * .07 * life, wide * fade, .1 + life * .16, wide * fade, t * .4 + i); }
    });
    dusts.forEach(([x, y, z], d) => {
      for (let k = 0; k < MOTES; k++) { const i = d * MOTES + k, a = rand(i, 9) * 6.283, drift = t * (.05 + rand(i, 10) * .07), rise = (rand(i, 11) + drift * .35) % 1, twinkle = .45 + .55 * Math.sin(t * (1.2 + rand(i, 12) * 2) + i); put(motes, i, x + Math.cos(a + drift) * (.3 + rand(i, 13) * 1.3), y - .9 + rise * 1.9, z + Math.sin(a * 1.3 + drift * .8) * (.3 + rand(i, 14) * 1.1), .028 * twinkle, .028 * twinkle, .028 * twinkle); }
    });
    gems.forEach(([x, y, z], g) => {
      for (let k = 0; k < GLINTS; k++) { const i = g * GLINTS + k, beat = Math.max(0, Math.sin(t * (1.1 + rand(i, 15) * 1.8) + rand(i, 16) * 6.283)), size = .07 * beat * beat * beat; put(glints, i, x + (rand(i, 17) - .5) * 1.1, y + (rand(i, 18) - .5) * .7, z + (rand(i, 19) - .5) * .35, size, size, size * .4, t + i); }
    });
    bobs.forEach((pivot) => { pivot.rotation.z = Math.sin(t * 2.6 + pivot.userData.phase) * .3; });
    for (const mesh of [core, tongues, embers, wisps, motes, glints]) if (mesh.count) mesh.instanceMatrix.needsUpdate = true;
  }
  tick(0);
  return { group, tick, counts: { fire: fires.length, candle: candles.length, steam: steams.length, motes: dusts.length, sparkle: gems.length, pendulum: swings.length },
    dispose() { for (const o of group.children) { if (o.isInstancedMesh) { o.material.dispose(); o.dispose(); } } brass.dispose(); } };
}
