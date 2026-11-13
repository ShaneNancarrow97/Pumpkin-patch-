// One kept palette for the existing surface lights, fog and grade pass.
import { createVillageGradeSample, villageAtmosphereAt, VILLAGE_ATMOSPHERE_CYCLE_SECONDS } from "./content/village-grade.js";
import { VILLAGE_GRADE } from "./picture-grade.js";

export function createVillageDistrictAtmosphere({ scene, hemi, sun, lamps }) {
  const sample = createVillageGradeSample(), grade = { saturation: 1, contrast: 1, vignette: 0, shadows: [0, 0, 0], lights: [0, 0, 0] };
  const status = { district: "green", phase: "night", worldUnits: true, cycleSeconds: VILLAGE_ATMOSPHERE_CYCLE_SECONDS, addedLights: 0, addedPasses: 0 };
  let frozenClock = null;
  function update(point, seconds, { reducedMotion = false } = {}) {
    if (!reducedMotion) frozenClock = null;
    else frozenClock ??= Number.isFinite(seconds) ? seconds : 0;
    villageAtmosphereAt(point, reducedMotion ? frozenClock : seconds, sample);
    grade.saturation = sample.saturation; grade.contrast = sample.contrast; grade.vignette = sample.vignette;
    for (let i = 0; i < 3; i++) { grade.shadows[i] = sample.shadows[i]; grade.lights[i] = sample.lights[i]; }
    scene.userData.grade = grade; scene.userData.exposure = sample.exposure;
    scene.fog?.color.fromArray(sample.fog);
    hemi.color.fromArray(sample.sky); hemi.groundColor.fromArray(sample.ground); hemi.intensity = sample.hemi;
    sun.color.fromArray(sample.moon); sun.intensity = sample.sun;
    for (const lamp of lamps) lamp.color.fromArray(sample.lamp);
    status.district = sample.district; status.phase = sample.phase;
    return sample.fogScale;
  }
  // The structural atlas has a stable neutral grade, independent of where the
  // owner stood when its cached picture was first requested. Other capture
  // lighting/fog is restored by the view's existing outer finally.
  function withAtlasGrade(render) {
    const previous = scene.userData.grade;
    try { scene.userData.grade = VILLAGE_GRADE; return render(); }
    finally { scene.userData.grade = previous; }
  }
  return { update, withAtlasGrade, status };
}
