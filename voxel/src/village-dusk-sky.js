// A painted-looking dusk on the existing sky dome: broad cloud banks, a warm
// horizon and distant ridges. The village itself still supplies every near view.
export const VILLAGE_DUSK_SKY = Object.freeze({
  cloudOctaves: 4, cloudWarpSamples: 1, cloudHashes: 20, silhouetteLayers: 3,
  addedMeshes: 0, addedDrawCalls: 0, addedLights: 0, addedTextures: 0, addedPasses: 0,
  maxLinearChannel: .68, maxTimeStep: .25,
});
export const VILLAGE_DUSK_CLOUDS = Object.freeze({ lowerElevation: .108, lowerWarp: .10, lowerCore: .018, lowerEdge: .070,
  upperElevation: .205, upperWarp: .14, upperCore: .025, upperEdge: .095, upperStrength: .82,
  densityFrom: .25, densityTo: .55, minimumDensity: .48 });
export const VILLAGE_DUSK_COLOURS = Object.freeze({
  zenith: Object.freeze([.018, .015, .045]), upper: Object.freeze([.045, .032, .105]), horizon: Object.freeze([.115, .052, .10]), below: Object.freeze([.032, .022, .055]),
  cloudShadow: Object.freeze([.015, .016, .038]), cloudBody: Object.freeze([.045, .034, .075]), moonRim: Object.freeze([.10, .083, .15]), warmRim: Object.freeze([.14, .068, .092]),
});
const C = VILLAGE_DUSK_CLOUDS, colour = key => `vec3(${VILLAGE_DUSK_COLOURS[key].join(", ")})`;
const smooth = (a, b, value) => { const t = Math.max(0, Math.min(1, (value - a) / (b - a))); return t * t * (3 - 2 * t); };
// Analytical coverage reference for the camera-cone regression. The shader
// uses these same bank dimensions and existing four noise samples; no CPU work
// is added to a drawn frame. A low camera must see depth, not just a rose base.
export function villageDuskCloudCoverage(y, broad, billows, folds, fine) {
  const lowerCentre = C.lowerElevation + (broad - .45) * C.lowerWarp, upperCentre = C.upperElevation + (billows - .45) * C.upperWarp;
  const lower = 1 - smooth(C.lowerCore, C.lowerEdge, Math.abs(y - lowerCentre)), upper = 1 - smooth(C.upperCore, C.upperEdge, Math.abs(y - upperCentre));
  const density = broad * .55 + billows * .25 + folds * .14 + fine * .06, envelope = smooth(-.015, .055, y) * (1 - smooth(.58, .92, y));
  return Math.max(lower, upper * C.upperStrength) * (C.minimumDensity + (1 - C.minimumDensity) * smooth(C.densityFrom, C.densityTo, density)) * envelope;
}
const dressed = new WeakMap();

const FRAGMENT = `
  uniform vec3 top, middle, horizon, low, moon;
  uniform float villageDuskTime;
  varying vec3 vDir;

  float duskHash(vec3 p) {
    p = fract(p * .3183099 + .1); p *= 17.;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float duskNoise(vec2 p) {
    vec2 cell = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
    return mix(mix(duskHash(vec3(cell, 1.)), duskHash(vec3(cell + vec2(1., 0.), 1.)), f.x),
      mix(duskHash(vec3(cell + vec2(0., 1.), 1.)), duskHash(vec3(cell + vec2(1., 1.), 1.)), f.x), f.y);
  }
  void main() {
    vec3 d = normalize(vDir); float y = d.y;
    // Keep the authored colour uniforms live beneath a richer violet dusk.
    vec3 zenith = mix(top, ${colour("zenith")}, .82);
    vec3 upper = mix(middle, ${colour("upper")}, .78);
    vec3 dusk = mix(horizon, ${colour("horizon")}, .82);
    vec3 below = mix(low, ${colour("below")}, .76);
    vec3 colour = y > .28 ? mix(upper, zenith, smoothstep(.28, .94, y))
      : y > 0. ? mix(dusk, upper, smoothstep(0., .28, y))
      : mix(dusk, below, smoothstep(0., .3, -y));
    float warmFacing = max(dot(d.xz, vec2(-.77, .638)), 0.);
    warmFacing *= warmFacing; warmFacing *= warmFacing;
    float horizonGlow = 1. - smoothstep(.004, .065, abs(y + .002));
    colour += vec3(.09, .042, .015) * horizonGlow * warmFacing;

    float cloud = 0.;
    if (y > -.015 && y < .94) {
      // A direction projection stays continuous through a complete camera turn.
      // One broad warp and four fixed octaves match the old cloud hash budget.
      vec2 q = d.xz * 2.1 / (max(y, 0.) + .35);
      float warp = duskNoise(q * .42 + vec2(9.2, -4.7));
      q += vec2(warp * .65, -warp * .28) + villageDuskTime * vec2(.009, -.004);
      float broad = duskNoise(q * .72);
      float billows = duskNoise(q * 1.43 + vec2(8.1, 2.7));
      float folds = duskNoise(q * 2.87 - vec2(4.3, 6.8));
      float fine = duskNoise(q * 5.7 + vec2(2.2, 9.4));
      float density = broad * .55 + billows * .25 + folds * .14 + fine * .06;
      float lowerCentre = ${C.lowerElevation} + (broad - .45) * ${C.lowerWarp};
      float upperCentre = ${C.upperElevation} + (billows - .45) * ${C.upperWarp};
      float lowerBank = 1. - smoothstep(${C.lowerCore}, ${C.lowerEdge}, abs(y - lowerCentre));
      float upperBank = 1. - smoothstep(${C.upperCore}, ${C.upperEdge}, abs(y - upperCentre));
      float bank = smoothstep(-.015, .055, y) * (1. - smoothstep(.58, .92, y));
      cloud = max(lowerBank, upperBank * ${C.upperStrength}) * (${C.minimumDensity} + ${1 - C.minimumDensity} * smoothstep(${C.densityFrom}, ${C.densityTo}, density)) * bank;
      float relief = clamp((billows - broad) * 2.7 + .45, 0., 1.);
      vec3 shadow = mix(middle, ${colour("cloudShadow")}, .92);
      vec3 rim = mix(${colour("moonRim")}, ${colour("warmRim")}, warmFacing);
      vec3 body = mix(shadow, ${colour("cloudBody")}, relief * .56);
      colour = mix(colour, body, cloud * .96);
      // Only the upper lips catch light. A broad additive rim would cancel
      // the very cloud shadow that gives a low-angle entrance view its depth.
      float lowerLip = smoothstep(.018, .045, y - lowerCentre) * (1. - smoothstep(.045, .075, y - lowerCentre));
      float upperLip = smoothstep(.025, .065, y - upperCentre) * (1. - smoothstep(.065, .105, y - upperCentre));
      float litEdge = max(lowerLip, upperLip) * (.35 + .65 * fine) * bank;
      colour = mix(colour, rim, litEdge * .10);
      float veil = smoothstep(.54, .77, billows) * smoothstep(.28, .55, y) * (1. - smoothstep(.72, .94, y));
      colour = mix(colour, rim, veil * .14);
    }

    // Sparse, small stars sit behind the clouds, with no shimmer animation.
    vec3 starCell = floor(d * 190.); float star = duskHash(starCell);
    if (star > .9982 && y > .12) {
      float point = 1. - smoothstep(.06, .28, length(fract(d * 190.) - .5));
      colour += vec3(.23, .22, .27) * point * smoothstep(.12, .48, y) * (1. - cloud);
    }
    // The real moon disc and halo remain in their existing meshes. This only
    // lends a little silver to nearby clouds, rather than whitening the sky.
    float moonFacing = max(dot(d, moon), 0.);
    colour += vec3(.12, .10, .19) * pow(moonFacing, 24.) * .28 * (1. - cloud * .7);
    colour += vec3(.05, .04, .08) * pow(moonFacing, 96.) * .6;

    // These low bands are a distant backdrop, not substitute village geometry.
    // Integer harmonics meet exactly at the azimuth seam.
    if (y < .08) {
      float angle = atan(d.z, d.x);
      float farRidge = .012 + sin(angle * 3. + 1.1) * .017 + sin(angle * 7. - .4) * .008 + sin(angle * 13. + 1.3) * .005;
      float middleRidge = -.014 + sin(angle * 5. - .2) * .013 + sin(angle * 11. + 2.1) * .006;
      float nearRidge = -.038 + sin(angle * 9. + .8) * .012 + sin(angle * 19. - 1.4) * .004;
      colour = mix(colour, vec3(.09, .052, .13), (1. - smoothstep(farRidge - .003, farRidge + .003, y)) * .74);
      colour = mix(colour, vec3(.045, .028, .075), (1. - smoothstep(middleRidge - .003, middleRidge + .003, y)) * .8);
      colour = mix(colour, vec3(.025, .018, .043), (1. - smoothstep(nearRidge - .003, nearRidge + .003, y)) * .86);
    }
    gl_FragColor = vec4(clamp(colour, vec3(0.), vec3(${VILLAGE_DUSK_SKY.maxLinearChannel})), 1.);
  }`;

// Dress only the existing buildHorizon().userData.sky. Its uniform objects,
// geometry, vertex shader and draw flags remain owned by the original builder.
export function dressVillageDuskSky(mesh) {
  if (dressed.has(mesh)) return dressed.get(mesh);
  const material = mesh?.material;
  if (!mesh?.isMesh || !material?.isShaderMaterial || !material.vertexShader.includes("vDir") || !["top", "middle", "horizon", "low", "moon"].every(key => material.uniforms[key]?.value)) {
    throw new TypeError("Village dusk needs the existing horizon sky and its authored colour uniforms.");
  }
  const previous = { fragment: material.fragmentShader, key: material.customProgramCacheKey, time: material.uniforms.villageDuskTime, data: mesh.userData.villageDuskSky };
  const key = material.customProgramCacheKey(), time = { value: 0 }, stats = { ...VILLAGE_DUSK_SKY, time: 0 };
  material.uniforms.villageDuskTime = time;
  material.fragmentShader = FRAGMENT;
  material.customProgramCacheKey = () => `${key}|village-dusk-sky-v2`;
  material.needsUpdate = true;
  mesh.userData.villageDuskSky = stats;
  let disposed = false;
  const layer = { stats,
    tick(dt = 0, { paused = false, reducedMotion = false } = {}) {
      if (disposed || paused || reducedMotion || !Number.isFinite(dt) || dt <= 0) return;
      time.value += Math.min(VILLAGE_DUSK_SKY.maxTimeStep, dt); stats.time = time.value;
    },
    dispose() {
      if (disposed) return;
      disposed = true; dressed.delete(mesh);
      material.fragmentShader = previous.fragment; material.customProgramCacheKey = previous.key;
      if (previous.time === undefined) delete material.uniforms.villageDuskTime;
      else material.uniforms.villageDuskTime = previous.time;
      if (previous.data === undefined) delete mesh.userData.villageDuskSky;
      else mesh.userData.villageDuskSky = previous.data;
      material.needsUpdate = true;
    },
  };
  dressed.set(mesh, layer); return layer;
}
