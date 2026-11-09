// Render-only cursed fungus. Rules own readiness, timers and saved clear counts.
import * as THREE from 'three';

export const BLIGHT_PARTICLE_LIMIT = 24;
const AMBIENT_SLOTS = 12, BURST_SIZE = 6, BURST_SECONDS = .8, REACH_SQ = 28 * 28;
const ROOT = 0x33202f, ROOT_EDGE = 0x573047, CRIMSON = 0x9b2449, OOZE = 0xd64463;
const PURPLE = 0x633b7f, CAP_EDGE = 0x8d56a6, GILL = 0xad7897;

export const BLIGHT_MODEL_BOX_LIMIT = 900;
const CAP_TONES = [0x4b285b, 0x603477, 0x75458d, 0x8657a2, 0x9b6cb4, 0x753d73];

// Thin forked roots and curved stalks support circular, finely stepped domes.
// f is the existing village writer; dimensions stay inside the original pick.
export function cursedFungus(f, r = () => .5) {
  const phase = r() * Math.PI * 2;
  const strand = (x0, z0, angle, length, width, bend, segments) => {
    let px = x0, pz = z0;
    for (let k = 1; k <= segments; k++) {
      const t = k / segments, curl = Math.max(0, t - .7) * 1.3;
      const a = angle + curl, ripple = Math.sin(t * Math.PI * 2.2 + bend) * Math.sin(t * Math.PI) * .026;
      const x = x0 + Math.cos(a) * length * t + Math.sin(angle) * ripple;
      const z = z0 + Math.sin(a) * length * t - Math.cos(angle) * ripple;
      const w = width * (1 - t * .82) + .003, y = .008 + Math.sin(t * 4 + bend) ** 2 * .006;
      const h = .012 - t * .006;
      f.block((px + x) / 2, y, (pz + z) / 2, Math.abs(x - px) + w, h, Math.abs(z - pz) + w, k % 3 ? ROOT : ROOT_EDGE);
      if (k === 5 || k === 9) f.block(x, y + h, z, w * .42, .0025, w * .55, CRIMSON);
      px = x; pz = z;
    }
  };
  for (let branch = 0; branch < 6; branch++) {
    const a = branch / 6 * Math.PI * 2 + phase * .12, length = .345 + r() * .045;
    strand(.014 * Math.cos(a), .014 * Math.sin(a), a, length, .024, phase + branch, 14);
    const forkAt = .14 + branch % 2 * .04;
    strand(Math.cos(a) * forkAt, Math.sin(a) * forkAt, a + (branch % 2 ? -.7 : .72), .12 + r() * .035, .013, phase - branch, 7);
  }
  // Loose crumbs sit between the roots, not on a square foundation tile.
  for (let i=0;i<9;i++) { const a=i*2.4+phase,d=.04+r()*.15;f.block(Math.cos(a)*d,.006,Math.sin(a)*d,.022+r()*.017,.009,.024,0x332532); }
  const caps = [
    { x:-.075,z:.012,y:.41,radius:.225,dome:.165,steps:6 },
    { x:.215,z:.175,y:.255,radius:.145,dome:.105,steps:5 },
    { x:.2,z:-.19,y:.31,radius:.163,dome:.127,steps:5 },
    { x:-.225,z:-.195,y:.17,radius:.09,dome:.08,steps:4 },
  ];
  for (let i = 0; i < caps.length; i++) {
    const cap = caps[i], {x,z,y,radius,dome,steps} = cap;
    const stemWidth=i ? .04 : .058, stemHeight=y-.025;
    for (let s=0;s<8;s++) {
      const t=(s+.5)/8,curve=Math.sin(t*Math.PI)*(.025+i*.006),sx=x+curve*(i%2?-1:1),sz=z+Math.sin(t*Math.PI*1.2)*.015;
      const w=stemWidth*(1-t*.18),h=stemHeight/8+.001,foot=.025+s*stemHeight/8;
      f.block(sx,foot,sz,w*.67,h,w,0x67465f);f.block(sx,foot,sz,w,h,w*.67,0x67465f);
      f.block(sx-w*.32,foot+.003,sz-w*.1,.007,h*.9,w*.38,0xa77a91);
    }
    // A circular lattice forms a true dome silhouette, rather than square slabs.
    const cell=radius/steps;
    for (let ix=-steps;ix<=steps;ix++) for(let iz=-steps;iz<=steps;iz++) {
      const u=ix/steps,v=iz/steps,radial=u*u+v*v;
      if(radial>1)continue;
      const height=.017+dome*Math.sqrt(1-radial);
      const light=Math.max(0,Math.min(4,Math.round(2+(-u-v)*.7+(1-radial)*.6+(r()-.5)*.8)));
      f.block(x+ix*cell,y,z+iz*cell,cell*1.01,height,cell*1.01,i===1&&radial>.65?CAP_TONES[5]:CAP_TONES[light]);
    }
    // Fine radial gills read underneath the overhanging cap.
    for(let g=0;g<10;g++)for(let s=1;s<=3;s++) {
      const a=g/10*Math.PI*2+i*.13,reach=radius*(.15+s*.2);
      f.block(x+Math.cos(a)*reach,y-.018, z+Math.sin(a)*reach,.013,.012,.015,g%2?GILL:0x80516f);
    }
    for(let k=0;k<3;k++) {
      const a=k*2.399+i*.8,d=radius*(.28+k*.16),dx=Math.cos(a)*d,dz=Math.sin(a)*d;
      const top=y+.017+dome*Math.sqrt(Math.max(0,1-(dx*dx+dz*dz)/(radius*radius)));
      f.block(x+dx,top,z+dz,.017,.007,.017,k===0?OOZE:0xbe88ae,k===0&&i<2);
    }
    // The thin threads end in rounded red beads; only two beads are emissive.
    for(let drop=0;drop<2;drop++) {
      const a=i*.9+drop*2.3,dx=Math.cos(a)*radius*.88,dz=Math.sin(a)*radius*.88,length=.039+drop*.018;
      f.block(x+dx,y-length,z+dz,.009,length+.016,.011,CRIMSON);
      f.block(x+dx,y-length-.009,z+dz,.019,.022,.018,OOZE,i===0&&drop===0);
    }
  }
  for(let i=0;i<2;i++) {
    const x=-.19+i*.31,z=.18-i*.25;
    f.block(x,.02,z,.027,.055,.027,0x67465f);
    f.block(x,.065,z,.065,.023,.055,PURPLE);f.block(x,.085,z,.045,.026,.041,CAP_EDGE);
  }
}

// One instanced pool for nearby drifting spores and at most two clearing puffs.
// No lights, texture downloads, DOM reads or per-frame allocation are involved.
export function createCursedSporeField({ groundAt = () => 0 } = {}) {
  const group = new THREE.Group(); group.name = 'Cursed fungus spores'; group.visible = false;
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .72, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending });
  const mesh = new THREE.InstancedMesh(geometry, material, BLIGHT_PARTICLE_LIMIT); mesh.frustumCulled = false; mesh.count = 0; group.add(mesh);
  const transform = new THREE.Object3D(), colour = new THREE.Color();
  for (let i = 0; i < BLIGHT_PARTICLE_LIMIT; i++) mesh.setColorAt(i, colour.setHex(i % 2 ? 0xa267bc : 0xba3457));
  const entries = [], byId = new Map(), nearest = new Int16Array(3), distances = new Float64Array(3);
  const bursts = Array.from({ length: 2 }, () => ({ age: BURST_SECONDS, x: 0, y: 0, z: 0, seed: 0 }));
  const pull = { on: false, x: 0, y: 0, z: 0, handX: 0, handY: 0, handZ: 0, progress: 0 };
  let time = 0, disposed = false, puffCount = 0, ambientCount = 0, burstCount = 0;
  const puff = entry => {
    let burst = bursts[0]; if (bursts[1].age > burst.age) burst = bursts[1];
    burst.age = 0; burst.x = entry.x; burst.y = groundAt(entry.x, entry.z) + .23; burst.z = -entry.z; burst.seed = entry.cycle * .83 + entry.x; puffCount++;
  };
  const put = (index, x, y, z, size, turn) => {
    transform.position.set(x, y, z); transform.scale.setScalar(Math.max(.001, size)); transform.rotation.set(turn * .7, turn, turn * .35); transform.updateMatrix(); mesh.setMatrixAt(index, transform.matrix);
  };
  return {
    group,
    sync(rows) {
      if (disposed) return;
      for (const row of rows) {
        let entry = byId.get(row.id);
        if (!entry) { entry = { id: row.id, x: row.x, z: row.z, y: groundAt(row.x, row.z), ready: false, cycle: 0 }; byId.set(row.id, entry); entries.push(entry); }
        if (entry.ready && !row.ready && row.cycle > entry.cycle) { puff(entry); if (Math.hypot(pull.x-entry.x,pull.z+entry.z)<.2) pull.on=false; }
        entry.x = row.x; entry.z = row.z; entry.y = groundAt(row.x, row.z); entry.ready = !!row.ready; entry.cycle = row.cycle;
      }
    },
    rooting(x, z, handX, handY, handZ, progress = 0) {
      pull.on = Number.isFinite(x) && Number.isFinite(z) && Number.isFinite(handX) && Number.isFinite(handY) && Number.isFinite(handZ);
      if (!pull.on) return;
      pull.x=x;pull.y=groundAt(x,z)+.4;pull.z=-z;pull.handX=handX;pull.handY=handY;pull.handZ=handZ;pull.progress=Math.min(1,Math.max(0,Number(progress)||0));
    },
    tick(dt, focus, visible = true, reducedMotion = false, paused = false) {
      if (disposed) return;
      const step = paused ? 0 : Math.max(0, Math.min(.15, Number(dt) || 0)); time += step;
      for (let i = 0; i < bursts.length; i++) bursts[i].age = Math.min(BURST_SECONDS, bursts[i].age + step);
      group.visible = !!visible && !reducedMotion; ambientCount = burstCount = 0;
      if (!group.visible || !focus) { mesh.count = 0; return; }
      nearest.fill(-1); distances.fill(REACH_SQ);
      for (let i = 0; i < entries.length; i++) {
        const e = entries[i]; if (!e.ready) continue;
        const d = (e.x - focus.x) ** 2 + (-e.z - focus.z) ** 2;
        for (let n = 0; n < 3; n++) if (d < distances[n]) { for (let j = 2; j > n; j--) { distances[j] = distances[j - 1]; nearest[j] = nearest[j - 1]; } distances[n] = d; nearest[n] = i; break; }
      }
      let count = 0;
      for (let n = 0; n < 3; n++) {
        if (nearest[n] < 0) continue;
        const e = entries[nearest[n]], seed = e.x * .21 + e.z * .37;
        for (let p = 0; p < AMBIENT_SLOTS / 3; p++) {
          const life = ((time * .17 + p * .247 + seed) % 1 + 1) % 1, a = seed + p * 2.4 + time * .22, radius = .16 + life * .22;
          if (n===0 && pull.on) {
            const t=(time*1.4+p*.25)%1,swirl=(1-t)*.15,turn=time*4+p*1.7;
            put(count++,pull.x+(pull.handX-pull.x)*t+Math.cos(turn)*swirl,pull.y+(pull.handY-pull.y)*t,pull.z+(pull.handZ-pull.z)*t+Math.sin(turn)*swirl,.025+pull.progress*.01,turn);
          } else put(count++, e.x + Math.cos(a) * radius, e.y + .38 + life * .78, -e.z + Math.sin(a) * radius, .018 + Math.sin(life * Math.PI) * .021, a);
          ambientCount++;
        }
      }
      for (let b = 0; b < bursts.length; b++) {
        const e = bursts[b]; if (e.age >= BURST_SECONDS || (e.x - focus.x) ** 2 + (e.z - focus.z) ** 2 > REACH_SQ) continue;
        const t = e.age / BURST_SECONDS;
        for (let p = 0; p < BURST_SIZE; p++) {
          const a = p / BURST_SIZE * Math.PI * 2 + e.seed, radius = .09 + t * .64;
          put(count++, e.x + Math.cos(a) * radius, e.y + Math.sin(t * Math.PI) * .48 + p % 2 * .06, e.z + Math.sin(a) * radius, .052 * (1 - t) + .004, a + t * 2); burstCount++;
        }
      }
      mesh.count = count; mesh.visible = count > 0; if (count) mesh.instanceMatrix.needsUpdate = true;
    },
    hide() { pull.on=false;group.visible = false; mesh.count = 0; },
    dispose() { if (disposed) return; disposed = true; group.remove(mesh); mesh.dispose(); geometry.dispose(); material.dispose(); byId.clear(); entries.length = 0; group.visible = false; mesh.count = ambientCount = burstCount = 0; pull.on=false; },
    get stats() { return { limit: BLIGHT_PARTICLE_LIMIT, live: mesh.count, ambient: ambientCount, puff: burstCount, puffsCreated: puffCount, rooting: pull.on, addedLights: 0, disposed }; },
  };
}
