import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { VILLAGE_DISTRICT_GRADES, VILLAGE_GRADE_ZONES, VILLAGE_ATMOSPHERE_CYCLE_SECONDS, createVillageGradeSample, villageAtmosphereAt } from "../src/content/village-grade.js";
import { createVillageDistrictAtmosphere } from "../src/village-district-atmosphere.js";
import { GradeShader, applyGrade, VILLAGE_GRADE } from "../src/picture-grade.js";
import { buildVillageNeighbourhoods } from "../src/village-neighbourhoods.js";
import { finishVoxels } from "../src/voxel-finish.js";
import { installVillageNeighbourhoodVisibility, tickVillageNeighbourhoodVisibility, withVillageNeighbourhoodVisibilityRestored } from "../src/village-neighbourhood-visibility.js";

const channels = sample => [sample.saturation, sample.contrast, sample.vignette, sample.exposure, sample.hemi, sample.sun, sample.fogScale, ...["fog", "sky", "ground", "moon", "lamp", "shadows", "lights"].flatMap(key => sample[key])];
const centre = zone => ({ x: (zone.bounds[0] + zone.bounds[2]) / 2, z: (zone.bounds[1] + zone.bounds[3]) / 2 });
const fixture = () => {
  const scene = new THREE.Scene(), hemi = new THREE.HemisphereLight(), sun = new THREE.DirectionalLight(), lamps = Array.from({ length: 8 }, () => new THREE.PointLight());
  scene.fog = new THREE.FogExp2(); scene.add(hemi, sun, ...lamps);
  return { scene, hemi, sun, lamps, atmosphere: createVillageDistrictAtmosphere({ scene, hemi, sun, lamps }) };
};

test("spread world districts have distinct kept moonlit palettes and a finite Green fallback", () => {
  const samples = VILLAGE_GRADE_ZONES.map(zone => villageAtmosphereAt(centre(zone)));
  assert.deepEqual(samples.map(sample => sample.district), VILLAGE_GRADE_ZONES.map(zone => zone.id));
  assert.equal(new Set(samples.map(sample => JSON.stringify(sample.fog))).size, samples.length);
  assert.equal(new Set(samples.map(sample => JSON.stringify(sample.sky))).size, samples.length);
  assert.equal(villageAtmosphereAt({ x: 87, z: 12 }).district, "green");
  for (const point of [null, { x: NaN, z: 9 }, { x: 9, z: Infinity }, { x: -1e8, z: 1e8 }]) {
    const sample = villageAtmosphereAt(point, NaN); assert.equal(sample.district, "green"); assert.ok(channels(sample).every(Number.isFinite));
  }
  const target = createVillageGradeSample(), colours = target.fog;
  assert.equal(villageAtmosphereAt(centre(VILLAGE_GRADE_ZONES[0]), 400, target), target); assert.equal(target.fog, colours, "runtime resolves into kept arrays");
});

test("walked district edges and diagonal corners blend continuously on every side", () => {
  for (const zone of VILLAGE_GRADE_ZONES) {
    const [x0, z0, x1, z1] = zone.bounds, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const lines = [t => ({ x: x0 + t, z: cz }), t => ({ x: x1 + t, z: cz }), t => ({ x: cx, z: z0 + t }), t => ({ x: cx, z: z1 + t }), t => ({ x: x0 + t, z: z0 + t }), t => ({ x: x1 + t, z: z1 + t })];
    for (const line of lines) {
      let prior = channels(villageAtmosphereAt(line(-4), 600));
      for (let step = 1; step <= 160; step++) {
        const next = channels(villageAtmosphereAt(line(-4 + step * .05), 600));
        assert.ok(next.every((value, i) => Math.abs(value - prior[i]) < .008), `${zone.id} has no visible boundary jump`); prior = next;
      }
    }
  }
});

test("saved active time gives a continuous periodic dusk/night/dawn curve without a wall clock", () => {
  const point = centre(VILLAGE_GRADE_ZONES[0]), period = VILLAGE_ATMOSPHERE_CYCLE_SECONDS;
  assert.equal(villageAtmosphereAt(point, 0).phase, "night"); assert.equal(villageAtmosphereAt(point, period / 3).phase, "dawn"); assert.equal(villageAtmosphereAt(point, period * 2 / 3).phase, "dusk");
  assert.deepEqual(channels(villageAtmosphereAt(point, 0)), channels(villageAtmosphereAt(point, period)));
  for (const time of [0, period / 3, period * 2 / 3, period]) {
    const before = channels(villageAtmosphereAt(point, Math.max(0, time - .001))), after = channels(villageAtmosphereAt(point, time + .001));
    assert.ok(before.every((value, i) => Math.abs(value - after[i]) < 1e-7), `phase seam at ${time}`);
  }
  for (let clock = 0; clock < period; clock += 17) { const sample = villageAtmosphereAt(point, clock); assert.ok(sample.exposure >= 1.13 && sample.exposure <= 1.18); assert.ok(sample.fogScale >= .94 && sample.fogScale <= 1.06); }
});

test("neutral greys retain restrained grading through every district and hour", () => {
  const smooth = (a, b, value) => { const t = Math.max(0, Math.min(1, (value - a) / (b - a))); return t * t * (3 - 2 * t); };
  for (const palette of Object.values(VILLAGE_DISTRICT_GRADES)) {
    assert.ok(palette.saturation <= 1.1 && palette.contrast <= 1.05 && palette.vignette <= .24);
    for (const grey of [.25, .5, .75]) {
      const graded = [0, 1, 2].map(i => (grey - .5) * palette.contrast + .5 + palette.shadows[i] * (1 - smooth(0, .5, grey)) + palette.lights[i] * smooth(.5, 1, grey));
      assert.ok(graded[2] - Math.min(...graded) < grey * .08, `${palette.id} does not push mid-grey over 8% towards blue`);
    }
  }
});

test("the adapter reuses the existing lights/grade and freezes time for pause or reduced motion", () => {
  const f = fixture(), count = f.scene.children.length, zone = centre(VILLAGE_GRADE_ZONES[2]);
  f.atmosphere.update(zone, 0); const grade = f.scene.userData.grade, arrays = [grade.shadows, grade.lights];
  f.atmosphere.update(zone, 900); assert.equal(f.atmosphere.status.phase, "dawn"); assert.equal(f.scene.userData.grade, grade); assert.deepEqual([grade.shadows, grade.lights], arrays);
  const paused = channels(villageAtmosphereAt(zone, 900)); f.atmosphere.update(zone, 900); assert.deepEqual(channels(villageAtmosphereAt(zone, 900)), paused);
  f.atmosphere.update(zone, 900, { reducedMotion: true }); const held = { exposure: f.scene.userData.exposure, lamp: f.lamps[0].color.toArray(), grade: JSON.stringify(grade) };
  f.atmosphere.update(zone, 1800, { reducedMotion: true }); assert.equal(f.scene.userData.exposure, held.exposure); assert.deepEqual(f.lamps[0].color.toArray(), held.lamp); assert.equal(JSON.stringify(grade), held.grade);
  f.atmosphere.update(centre(VILLAGE_GRADE_ZONES[4]), 1800, { reducedMotion: true }); assert.equal(f.atmosphere.status.district, "marsh", "reduced motion retains spatial travel cues");
  f.atmosphere.update(zone, 1800); assert.equal(f.atmosphere.status.phase, "dusk");
  assert.equal(f.scene.children.length, count); assert.equal(f.scene.children.filter(light => light.isPointLight).length, 8);
  const pass = { uniforms: THREE.UniformsUtils.clone(GradeShader.uniforms) }; applyGrade(pass, grade); assert.equal(pass.uniforms.saturation.value, grade.saturation);
  assert.equal(f.atmosphere.status.addedPasses, 0); assert.equal(f.atmosphere.status.addedLights, 0);
});

test("canonical atlas grade and current native fades restore together through nested render failure", () => {
  const f = fixture(); f.atmosphere.update(centre(VILLAGE_GRADE_ZONES[2]), 820); const grade = f.scene.userData.grade, before = JSON.stringify(grade);
  const group = buildVillageNeighbourhoods([{ id: "atlas-tree", kind: "orchard", x: 0, z: 0, props: false, trees: [{ x: 0, z: 0, size: 1 }] }]); finishVoxels(group); installVillageNeighbourhoodVisibility(group);
  tickVillageNeighbourhoodVisibility(group, { x: 6, y: 0, z: 0 }, { position: new THREE.Vector3(-6, 5, 0) }, .1);
  const shader = { uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader }; group.children[0].material.onBeforeCompile(shader);
  const values = Array.from(shader.uniforms.neighbourhoodVisibility.value);
  const capture = render => f.atmosphere.withAtlasGrade(() => withVillageNeighbourhoodVisibilityRestored(group, render));
  assert.throws(() => capture(() => {
    assert.equal(f.scene.userData.grade, VILLAGE_GRADE); assert.equal(shader.uniforms.neighbourhoodFadeEnabled.value, 0);
    assert.throws(() => capture(() => { throw new Error("nested render"); }), /nested render/);
    assert.equal(f.scene.userData.grade, VILLAGE_GRADE); assert.equal(shader.uniforms.neighbourhoodFadeEnabled.value, 0);
    throw new Error("outer render");
  }), /outer render/);
  assert.equal(f.scene.userData.grade, grade); assert.equal(JSON.stringify(grade), before); assert.equal(shader.uniforms.neighbourhoodFadeEnabled.value, 1); assert.deepEqual(Array.from(shader.uniforms.neighbourhoodVisibility.value), values);
  group.userData.dispose();
});
