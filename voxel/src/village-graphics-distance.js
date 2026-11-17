// The sky keeps its full lens; outdoor chunks disappear only in the village's
// haze. These choices never change walking, gathering or the map photograph.
export const VILLAGE_RENDER_DISTANCE = Object.freeze({
  near: Object.freeze({ look: 240, play: 150 }),
  balanced: Object.freeze({ look: 320, play: 200 }),
  far: Object.freeze({ look: 400, play: 250 }),
});
const BASE = Object.freeze({ look: { fog: .0042, far: 400 }, play: { fog: .0072, far: 250 }, inside: { fog: .0015, far: 0 } });
const valid = value => Object.hasOwn(VILLAGE_RENDER_DISTANCE, value) ? value : "far";

export function villageRenderReach(value, { following = false, enclosed = false, tour = false } = {}) {
  const requested = valid(value), quality = tour ? "far" : requested, mode = enclosed ? "inside" : following && !tour ? "play" : "look";
  const base = BASE[mode], far = enclosed ? 0 : VILLAGE_RENDER_DISTANCE[quality][mode];
  return { requested, quality, mode, far, fog: enclosed ? base.fog : base.fog * base.far / far };
}

// A lower setting waits for the fog to thicken before dropping chunks. Raising
// it reveals them behind the existing fog, which then clears gradually.
export function createVillageDistanceSettings({ scene, camera, patches }) {
  let quality = "far";
  const stats = { requested: quality, effective: quality, mode: "look", targetDistance: 400, drawDistance: 400, fogDensity: scene.fog?.density ?? 0, visiblePatches: 0, totalPatches: 0 };
  return {
    setQuality(value) { quality = valid(value); stats.requested = quality; return quality; },
    tick(dt, options = {}) {
      const reach = villageRenderReach(quality, options), fog = scene.fog;
      // A structural map capture temporarily borrows a fog-free scene and owns
      // all chunk visibility until it restores the snapshot in its finally.
      if (!fog) return;
      const fogScale = Number.isFinite(options.fogScale) && options.fogScale > 0 ? options.fogScale : 1;
      const target = reach.fog * fogScale, blend = Math.min(1, Math.max(0, Number.isFinite(dt) ? dt : 0) * 2);
      fog.density += (target - fog.density) * blend;
      // Far is the exact original policy. Lower profiles retain that same fog
      // coverage at their boundary, including district weather multipliers.
      const drawDistance = reach.mode === "inside" || reach.quality === "far" ? reach.far
        : Math.max(reach.far, Math.min(camera.far, reach.far * target / Math.max(.000001, fog.density)));
      let visiblePatches = 0;
      for (const patch of patches) {
        patch.chunk.visible = patch.sphere.center.distanceTo(camera.position) - patch.sphere.radius < drawDistance;
        if (patch.chunk.visible) visiblePatches++;
      }
      Object.assign(stats, { effective: reach.quality, mode: reach.mode, targetDistance: reach.far, drawDistance, fogDensity: fog.density, visiblePatches, totalPatches: patches.length });
    },
    get status() { return { ...stats }; },
  };
}
