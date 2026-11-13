// A painted-looking dusk on the existing sky dome: broad cloud banks, a warm
// horizon and distant ridges. The village itself still supplies every near view.
export const VILLAGE_DUSK_SKY = Object.freeze({
  cloudOctaves: 4, cloudWarpSamples: 1, cloudHashes: 20, silhouetteLayers: 3,
  addedMeshes: 0, addedDrawCalls: 0, addedLights: 0, addedTextures: 0, addedPasses: 0,
  maxLinearChannel: .68, maxTimeStep: .25,
});
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
    vec3 zenith = mix(top, vec3(.034, .014, .078), .82);
    vec3 upper = mix(middle, vec3(.14, .044, .22), .78);
    vec3 dusk = mix(horizon, vec3(.37, .11, .20), .82);
    vec3 below = mix(low, vec3(.065, .028, .11), .76);
    vec3 colour = y > .28 ? mix(upper, zenith, smoothstep(.28, .94, y))
      : y > 0. ? mix(dusk, upper, smoothstep(0., .28, y))
      : mix(dusk, below, smoothstep(0., .3, -y));
    float warmFacing = max(dot(d.xz, vec2(-.77, .638)), 0.);
    warmFacing *= warmFacing; warmFacing *= warmFacing;
    float horizonGlow = 1. - smoothstep(.015, .23, abs(y - .018));
    colour += vec3(.19, .085, .022) * horizonGlow * warmFacing;

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
      float bank = smoothstep(-.015, .07, y) * (1. - smoothstep(.58, .92, y));
      cloud = smoothstep(.39, .66, density) * bank;
      float edge = smoothstep(.39, .49, density) * (1. - smoothstep(.49, .66, density));
      float relief = clamp((billows - broad) * 2.7 + .45, 0., 1.);
      vec3 shadow = mix(middle, vec3(.055, .018, .095), .88);
      vec3 rim = mix(vec3(.24, .075, .20), vec3(.30, .13, .17), warmFacing);
      vec3 body = mix(shadow, rim, relief * (.28 + .48 * horizonGlow));
      colour = mix(colour, body, cloud * .86);
      colour += rim * edge * bank * .16 * (.35 + .65 * horizonGlow);
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
  material.customProgramCacheKey = () => `${key}|village-dusk-sky-v1`;
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
