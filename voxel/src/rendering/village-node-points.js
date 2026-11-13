import * as GPU from "three/webgpu";
import * as TSL from "three/tsl";

// WebGPU has no programmable point size. Keep these two village particle
// families in one bounded instanced draw each, with their original pixel sizes.
function familyOf(source) {
  if (!source?.isPoints || !source.geometry?.getAttribute("position") || Array.isArray(source.material)) return null;
  const m = source.material, g = source.geometry;
  if (m?.isShaderMaterial && m.uniforms?.tint && g.getAttribute("size") && g.getAttribute("alpha") &&
      /gl_PointSize\s*=\s*size\s*\*\s*320\./.test(m.vertexShader) &&
      /gl_PointCoord\s*-\s*\.5/.test(m.fragmentShader) && /vA\s*\*/.test(m.fragmentShader)) return "smoke";
  // The life fireflies are untextured PointsMaterial squares. Maps and custom
  // point shaders need explicit ports, rather than silently dropping features.
  if (m?.isPointsMaterial && !m.map && !m.alphaMap && !m.alphaTest && !m.alphaHash &&
      !m.vertexColors && !g.morphAttributes?.position?.length) return "fireflies";
  return null;
}

export function createVillagePointsDescriptor(source, bindUniform, { renderer } = {}) {
  const family = familyOf(source);
  if (!family) return null;
  const original = source.material;
  const geometry = new GPU.InstancedBufferGeometry();
  geometry.setAttribute("position", new GPU.Float32BufferAttribute([-.5, -.5, 0, .5, -.5, 0, .5, .5, 0, -.5, .5, 0], 3));
  geometry.setAttribute("uv", new GPU.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  const viewport = TSL.uniform(new GPU.Vector2(1, 1));
  const size = TSL.uniform(original.size ?? 1);
  const scale = TSL.uniform(1);
  const opacity = TSL.uniform(original.opacity ?? 1);
  const color = TSL.uniform(new GPU.Color().copy(original.color ?? original.uniforms.tint.value));
  const tint = family === "smoke" && bindUniform ? bindUniform(original.uniforms.tint, "color") : color;
  const attenuation = TSL.uniform(original.sizeAttenuation !== false ? 1 : 0);
  const material = new GPU.NodeMaterial();
  for (const key of ["transparent", "depthWrite", "depthTest", "blending", "blendSrc", "blendDst", "blendEquation", "blendSrcAlpha", "blendDstAlpha", "blendEquationAlpha", "premultipliedAlpha", "toneMapped", "fog", "visible", "colorWrite", "depthFunc", "polygonOffset", "polygonOffsetFactor", "polygonOffsetUnits"]) material[key] = original[key];
  // The smoke's ShaderMaterial defaults fog=true, but its authored fragment
  // has no fog chunk. Only the vanilla PointsMaterial actually fogs.
  if (family === "smoke") material.fog = false;
  material.name = `village-${family}-quads`;
  material.vertexNode = TSL.Fn(() => {
    const center = TSL.attribute("pointPosition", "vec3");
    // Fog must use the particle centre, not the four unit-quad corners.
    TSL.positionLocal.assign(center);
    const mv = TSL.modelViewMatrix.mul(TSL.vec4(center, 1)).toVar();
    // Three generates fog varyings before a custom vertexNode; overwrite its
    // view position after the centre transform so distance fog remains exact.
    TSL.positionView.assign(mv.xyz);
    const clip = TSL.cameraProjectionMatrix.mul(mv).toVar();
    let pixels;
    if (family === "smoke") pixels = TSL.attribute("pointSize", "float").mul(320).div(mv.z.negate());
    else {
      const perspective = TSL.cameraProjectionMatrix.element(2).element(3).equal(-1);
      pixels = size.mul(TSL.select(perspective.and(attenuation.greaterThan(0)), scale.div(mv.z.negate()), 1));
    }
    clip.xy.addAssign(TSL.positionGeometry.xy.mul(pixels).mul(2).div(viewport).mul(clip.w));
    return clip;
  })();
  material.fragmentNode = TSL.Fn(() => {
    if (family === "smoke") {
      const distance = TSL.uv().sub(.5).length().toVar();
      distance.greaterThan(.5).discard();
      const falloff = TSL.float(1).sub(distance.mul(2));
      return TSL.vec4(tint, TSL.attribute("pointAlpha", "float").mul(falloff.mul(falloff)));
    }
    return TSL.vec4(color, opacity);
  })();
  material.userData.villageNodePoints = { family, verticesPerPoint: 4, trianglesPerPoint: 2, rawOutput: family === "smoke" };
  let previous = null;
  const descriptor = {
    kind: "instanced-quads", geometry, material, count: 0,
    sync(mirror) {
      const g = source.geometry, position = g.getAttribute("position"), pointSize = g.getAttribute("size"), alpha = g.getAttribute("alpha"), index = g.index;
      const available = index?.count ?? position.count;
      const start = Math.min(available, Math.max(0, Math.floor(g.drawRange.start || 0)));
      const requested = g.drawRange.count;
      const count = Math.max(0, Math.min(available - start, Number.isFinite(requested) ? Math.floor(requested) : available));
      const state = [position, position.version, pointSize, pointSize?.version, alpha, alpha?.version, index, index?.version, start, count];
      if (!previous || state.some((value, i) => value !== previous[i])) {
        for (const [name, width, input, defaultValue] of [["pointPosition", 3, position, 0], ["pointSize", 1, pointSize, 1], ["pointAlpha", 1, alpha, 1]]) {
          let output = geometry.getAttribute(name);
          if (!output || output.count !== count) {
            output = new GPU.InstancedBufferAttribute(new Float32Array(count * width), width).setUsage(GPU.DynamicDrawUsage);
            geometry.setAttribute(name, output);
          }
          for (let i = 0; i < count; i++) {
            const sourceIndex = index ? index.getX(start + i) : start + i;
            for (let component = 0; component < width; component++) output.array[i * width + component] = input ? input.getComponent(sourceIndex, component) : defaultValue;
          }
          output.needsUpdate = true;
        }
        previous = state;
      }
      descriptor.count = count;
      geometry.instanceCount = count;
      if (mirror) mirror.count = count;
      if (renderer?.getDrawingBufferSize) renderer.getDrawingBufferSize(viewport.value);
      viewport.value.x = Math.max(1, viewport.value.x); viewport.value.y = Math.max(1, viewport.value.y);
      const ratio = Math.max(Number.EPSILON, renderer?.getPixelRatio?.() ?? 1);
      size.value = (original.size ?? 1) * ratio;
      // WebGL's scale is half its CSS height; its size already includes DPR.
      scale.value = viewport.value.y / ratio * .5;
      opacity.value = original.opacity ?? 1;
      color.value.copy(original.color ?? original.uniforms.tint.value);
      attenuation.value = original.sizeAttenuation !== false ? 1 : 0;
    },
  };
  descriptor.sync();
  return descriptor;
}
