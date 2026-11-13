import * as GPU from 'three/webgpu';
import {
  Fn, If, abs, asin, atan2, clamp, dot, float, floor, fract, length, max,
  min, mix, normalize, positionGeometry, pow, sin, smoothstep, varying,
  vec2, vec3, vec4,
} from 'three/tsl';
import {
  VILLAGE_DUSK_ART as ART, VILLAGE_DUSK_CLOUDS as CLOUDS,
  VILLAGE_DUSK_COLOURS as COLOURS,
  VILLAGE_SKY_HIGHLIGHTS as HIGHLIGHTS,
} from '../village-dusk-sky.js';

const duskHash = Fn(([point]) => {
  const p = fract(point.mul(.3183099).add(.1)).mul(17).toVar();
  return fract(p.x.mul(p.y).mul(p.z).mul(p.x.add(p.y).add(p.z)));
}).setLayout({ name: 'villageDuskHash', type: 'float', inputs: [{ name: 'point', type: 'vec3' }] });

const duskNoise = Fn(([point]) => {
  const cell = floor(point).toVar();
  const f = fract(point).toVar();
  f.assign(f.mul(f).mul(float(3).sub(f.mul(2))));
  return mix(
    mix(duskHash(vec3(cell, 1)), duskHash(vec3(cell.add(vec2(1, 0)), 1)), f.x),
    mix(duskHash(vec3(cell.add(vec2(0, 1)), 1)), duskHash(vec3(cell.add(vec2(1, 1)), 1)), f.x),
    f.y,
  );
}).setLayout({ name: 'villageDuskNoise', type: 'float', inputs: [{ name: 'point', type: 'vec2' }] });

/** Port the existing dome fragment without owning its geometry, texture or clocks. */
export function createVillageSkyNodeMaterial(sourceMaterial, bindUniform) {
  const source = sourceMaterial.uniforms;
  // Both types compile to vec3, but Three's Color uploader reads r/g/b.
  // Explicit vec3 would read missing x/y/z and poison the sky with NaN.
  const top = bindUniform(source.top, 'color');
  const middle = bindUniform(source.middle, 'color');
  const horizon = bindUniform(source.horizon, 'color');
  const low = bindUniform(source.low, 'color');
  const moon = bindUniform(source.moon, 'vec3');
  const time = bindUniform(source.villageDuskTime, 'float');
  const art = bindUniform(source.villageDuskArt, 'texture');
  const artReady = bindUniform(source.villageDuskArtReady, 'float');
  // The classic vertex normalizes before interpolation, then the fragment does
  // so again. World/camera position must not enter this camera-centred dome.
  const direction = varying(normalize(positionGeometry), 'villageDuskDirection');
  const material = new GPU.NodeMaterial();
  material.name = `${sourceMaterial.name || 'village-dusk-sky'}:webgpu`;
  for (const key of [
    'side', 'depthTest', 'depthWrite', 'depthFunc', 'colorWrite', 'transparent',
    'blending', 'blendSrc', 'blendDst', 'blendEquation', 'blendSrcAlpha',
    'blendDstAlpha', 'blendEquationAlpha', 'premultipliedAlpha', 'toneMapped',
    'dithering', 'alphaToCoverage', 'polygonOffset', 'polygonOffsetFactor',
    'polygonOffsetUnits',
  ]) material[key] = sourceMaterial[key];
  material.fog = false;
  material.lights = false;
  material.fragmentNode = Fn(() => {
    const d = normalize(direction).toVar();
    const y = d.y;
    const zenith = mix(top, vec3(...COLOURS.zenith), .82);
    const upper = mix(middle, vec3(...COLOURS.upper), .78);
    const dusk = mix(horizon, vec3(...COLOURS.horizon), .82);
    const below = mix(low, vec3(...COLOURS.below), .76);
    const colour = vec3(0).toVar();
    If(y.greaterThan(.28), () => {
      colour.assign(mix(upper, zenith, smoothstep(.28, .94, y)));
    }).ElseIf(y.greaterThan(0), () => {
      colour.assign(mix(dusk, upper, smoothstep(0, .28, y)));
    }).Else(() => {
      colour.assign(mix(dusk, below, smoothstep(0, .3, y.negate())));
    });
    const warmFacing = max(dot(d.xz, vec2(-.77, .638)), 0).toVar();
    warmFacing.mulAssign(warmFacing);
    warmFacing.mulAssign(warmFacing);
    const horizonGlow = float(1).sub(smoothstep(.004, .065, abs(y.add(.002))));
    colour.addAssign(vec3(.09, .042, .015).mul(horizonGlow).mul(warmFacing));

    const cloud = float(0).toVar();
    If(y.greaterThan(-.015).and(y.lessThan(.94)), () => {
      const q = d.xz.mul(2.1).div(max(y, 0).add(.35)).toVar();
      const warp = duskNoise(q.mul(.42).add(vec2(9.2, -4.7))).toVar();
      q.addAssign(vec2(warp.mul(.65), warp.mul(-.28)).add(time.mul(vec2(.009, -.004))));
      const broad = duskNoise(q.mul(.72)).toVar();
      const billows = duskNoise(q.mul(1.43).add(vec2(8.1, 2.7))).toVar();
      const folds = duskNoise(q.mul(2.87).sub(vec2(4.3, 6.8))).toVar();
      const fine = duskNoise(q.mul(5.7).add(vec2(2.2, 9.4))).toVar();
      const density = broad.mul(.55).add(billows.mul(.25)).add(folds.mul(.14)).add(fine.mul(.06));
      const lowerCentre = broad.sub(.45).mul(CLOUDS.lowerWarp).add(CLOUDS.lowerElevation).toVar();
      const upperCentre = billows.sub(.45).mul(CLOUDS.upperWarp).add(CLOUDS.upperElevation).toVar();
      const lowerBank = float(1).sub(smoothstep(CLOUDS.lowerCore, CLOUDS.lowerEdge, abs(y.sub(lowerCentre))));
      const upperBank = float(1).sub(smoothstep(CLOUDS.upperCore, CLOUDS.upperEdge, abs(y.sub(upperCentre))));
      const bank = smoothstep(-.015, .055, y).mul(float(1).sub(smoothstep(.58, .92, y))).toVar();
      cloud.assign(max(lowerBank, upperBank.mul(CLOUDS.upperStrength)).mul(
        smoothstep(CLOUDS.densityFrom, CLOUDS.densityTo, density)
          .mul(1 - CLOUDS.minimumDensity).add(CLOUDS.minimumDensity),
      ).mul(bank));
      const relief = clamp(billows.sub(broad).mul(2.7).add(.45), 0, 1);
      const shadow = mix(middle, vec3(...COLOURS.cloudShadow), .92);
      const rim = mix(vec3(...COLOURS.moonRim), vec3(...COLOURS.warmRim), warmFacing).toVar();
      const body = mix(shadow, vec3(...COLOURS.cloudBody), relief.mul(.56));
      colour.assign(mix(colour, body, cloud.mul(.96)));
      const lowerLip = smoothstep(.018, .045, y.sub(lowerCentre))
        .mul(float(1).sub(smoothstep(.045, .075, y.sub(lowerCentre))));
      const upperLip = smoothstep(.025, .065, y.sub(upperCentre))
        .mul(float(1).sub(smoothstep(.065, .105, y.sub(upperCentre))));
      const litEdge = max(lowerLip, upperLip).mul(fine.mul(.65).add(.35)).mul(bank);
      colour.assign(mix(colour, rim, litEdge.mul(.10)));
      const veil = smoothstep(.54, .77, billows).mul(smoothstep(.28, .55, y))
        .mul(float(1).sub(smoothstep(.72, .94, y)));
      colour.assign(mix(colour, rim, veil.mul(.14)));
    });

    If(artReady.greaterThan(.5), () => {
      const artAngle = float(0).toVar();
      If(dot(d.xz, d.xz).greaterThan(.00000001), () => { artAngle.assign(atan2(d.x, d.z.negate())); });
      const artU = fract(artAngle.div(6.28318530718).mul(ART.longitudeRepeats)
        .add(.5).add(time.mul(ART.driftTurnsPerSecond))).toVar();
      const artV = clamp(asin(clamp(y, -1, 1)).div(3.14159265359).add(.5), .001, .999).toVar();
      const painted = art.uv(vec2(artU, artV)).setUpdateMatrix(false).rgb.toVar();
      const otherEdge = art.uv(vec2(fract(artU.add(.5)), artV)).setUpdateMatrix(false).rgb;
      const seam = float(1).sub(smoothstep(0, ART.seamWidth, min(artU, float(1).sub(artU))));
      painted.assign(mix(painted, otherEdge, seam));
      const artBand = smoothstep(-.08, .025, y).mul(float(1).sub(smoothstep(.94, .995, y)));
      colour.assign(mix(colour, painted.mul(float(1).sub(cloud.mul(.05))), artBand.mul(ART.strength)));
    });

    const starCell = floor(d.mul(190));
    const star = duskHash(starCell);
    If(star.greaterThan(.9982).and(y.greaterThan(.12)), () => {
      const point = float(1).sub(smoothstep(.06, .28, length(fract(d.mul(190)).sub(.5))));
      colour.addAssign(vec3(.23, .22, .27).mul(point).mul(smoothstep(.12, .48, y)).mul(float(1).sub(cloud)));
    });
    const moonFacing = max(dot(d, moon), 0).toVar();
    colour.addAssign(vec3(.12, .10, .19).mul(pow(moonFacing, 24)).mul(.28).mul(float(1).sub(cloud.mul(.7))));
    colour.addAssign(vec3(.05, .04, .08).mul(pow(moonFacing, 96)).mul(.6));

    If(y.lessThan(.08), () => {
      const angle = atan2(d.z, d.x).toVar();
      const farRidge = sin(angle.mul(3).add(1.1)).mul(.017)
        .add(sin(angle.mul(7).sub(.4)).mul(.008)).add(sin(angle.mul(13).add(1.3)).mul(.005)).add(.012).toVar();
      const middleRidge = sin(angle.mul(5).sub(.2)).mul(.013)
        .add(sin(angle.mul(11).add(2.1)).mul(.006)).sub(.014).toVar();
      const nearRidge = sin(angle.mul(9).add(.8)).mul(.012)
        .add(sin(angle.mul(19).sub(1.4)).mul(.004)).sub(.038).toVar();
      colour.assign(mix(colour, vec3(.09, .052, .13), float(1).sub(smoothstep(farRidge.sub(.003), farRidge.add(.003), y)).mul(.74)));
      colour.assign(mix(colour, vec3(.045, .028, .075), float(1).sub(smoothstep(middleRidge.sub(.003), middleRidge.add(.003), y)).mul(.8)));
      colour.assign(mix(colour, vec3(.025, .018, .043), float(1).sub(smoothstep(nearRidge.sub(.003), nearRidge.add(.003), y)).mul(.86)));
    });
    colour.assign(clamp(colour, vec3(0), vec3(.68)));
    const peak = max(colour.r, max(colour.g, colour.b)).toVar();
    const excess = max(0, peak.sub(HIGHLIGHTS.knee)).toVar();
    const shoulder = excess.div(float(1).add(excess.div(HIGHLIGHTS.shoulder))).add(HIGHLIGHTS.knee);
    return vec4(colour.mul(min(1, shoulder.div(max(peak, .00001)))), 1);
  })();
  return material;
}
