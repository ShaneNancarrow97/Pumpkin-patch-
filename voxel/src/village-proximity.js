import * as THREE from 'three';

export const PROXIMITY_RING_LIMIT = 12;
export const PROXIMITY_REACH = 7;
export function proximityStrength(distance, reach = PROXIMITY_REACH) {
  if (!Number.isFinite(distance) || distance < 0) return 0;
  const t = Math.max(0, Math.min(1, (reach - distance) / Math.max(.001, reach - 2.5)));
  return t * t * (3 - 2 * t);
}

// One tiny shared texture; the halo never changes the scene's light count.
function softTexture(ring) {
  const side = 64, bytes = new Uint8Array(side * side * 4);
  for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) {
    const d = Math.hypot((x + .5) / side * 2 - 1, (y + .5) / side * 2 - 1);
    const a = ring ? Math.exp(-(((d - .77) / .09) ** 2)) : Math.max(0, 1 - d) ** 2;
    const i = (y * side + x) * 4;
    bytes[i] = bytes[i + 1] = bytes[i + 2] = 255; bytes[i + 3] = Math.round(a * 255);
  }
  const texture = new THREE.DataTexture(bytes, side, side); texture.needsUpdate = true;
  texture.magFilter = texture.minFilter = THREE.LinearFilter;
  return texture;
}

// A small pool reveals nearby things to gather, plus the owner's soft footlight.
export function createVillageProximity(scene, groundAt) {
  const group = new THREE.Group(); group.name = 'Village nearby lights'; group.visible = false; scene.add(group);
  const geometry = new THREE.PlaneGeometry(1, 1), ringMap = softTexture(true), glowMap = softTexture(false);
  const make = (map, colour) => {
    const material = new THREE.MeshBasicMaterial({map, color: colour, transparent: true, opacity: 0, depthWrite: false, toneMapped: false});
    const mesh = new THREE.Mesh(geometry, material); mesh.rotation.x = -Math.PI / 2; mesh.visible = false; group.add(mesh); return mesh;
  };
  const glow = make(glowMap, 0xffd8a0); glow.scale.setScalar(4.2);
  const rings = Array.from({length: PROXIMITY_RING_LIMIT}, () => make(ringMap, 0xcdb6f3));
  let shown = [];
  return {
    update({position, targets = [], inside = false, visible = true, time = 0, reducedMotion = false} = {}) {
      group.visible = !!visible && !!position;
      if (!group.visible) { shown = []; return; }
      glow.visible = true; glow.position.set(position.x, (inside ? .2 : groundAt(position.x, position.z)) + .045, -position.z);
      glow.material.opacity = .22;
      shown = inside ? [] : targets.map(t => ({...t, distance: Math.hypot(t.x - position.x, t.z - position.z)}))
        .filter(t => Number.isFinite(t.x) && Number.isFinite(t.z) && proximityStrength(t.distance) > 0)
        .sort((a, b) => a.distance - b.distance).slice(0, PROXIMITY_RING_LIMIT);
      rings.forEach((ring, i) => {
        const target = shown[i]; ring.visible = !!target;
        if (!target) return;
        ring.position.set(target.x, groundAt(target.x, target.z) + .045, -target.z);
        ring.scale.setScalar(target.quest ? 1.55 : 1.35);
        ring.material.color.setHex(target.quest ? 0xffd590 : 0xcdb6f3);
        ring.material.opacity = proximityStrength(target.distance) * (target.quest ? .48 : .34) * (reducedMotion ? 1 : .96 + Math.sin(time * 2.2 + i) * .04);
      });
    },
    hide() { group.visible = false; shown = []; },
    dispose() { scene.remove(group); rings.forEach(m => m.material.dispose()); glow.material.dispose(); geometry.dispose(); ringMap.dispose(); glowMap.dispose(); },
    get status() { return {visible: group.visible, rings: shown.map(t => ({id: t.id, quest: !!t.quest, distance: t.distance})), limit: PROXIMITY_RING_LIMIT, lights: 0}; }
  };
}
