import * as GPU from 'three/webgpu';
import * as T from 'three/tsl';
import { createVillageSkyNodeMaterial } from './village-node-sky.js';
import { createVillagePointsDescriptor } from './village-node-points.js';

const FLAGS = ['side', 'transparent', 'opacity', 'depthWrite', 'depthTest', 'depthFunc', 'colorWrite', 'blending', 'blendSrc', 'blendDst', 'blendEquation', 'blendSrcAlpha', 'blendDstAlpha', 'blendEquationAlpha', 'premultipliedAlpha', 'toneMapped', 'fog', 'visible', 'polygonOffset', 'polygonOffsetFactor', 'polygonOffsetUnits'];

function familyOf(material, mesh) {
  if (!material?.isShaderMaterial) return null;
  const u = material.uniforms, vertex = material.vertexShader, fragment = material.fragmentShader;
  if (u.villageDuskTime && u.villageDuskArt && fragment.includes('duskNoise')) return 'sky';
  if (!mesh?.isInstancedMesh || !mesh.instanceMatrix) return null;
  if (vertex.includes('contactOpacity') && fragment.includes('vContactOpacity')) return 'contact';
  if (u.airTime && u.airHaze && vertex.includes('airSeed')) return u.airTreeVisibility ? 'shaft' : 'air-fly';
  if (u.haze && u.size && u.strength && mesh.instanceColor) {
    if (u.reach && vertex.includes('reach')) return 'pool';
    if (u.time && vertex.includes('seed')) return 'halo';
  }
  return null;
}

/** Explicit ports of village custom shaders. Source resources and clocks remain borrowed. */
export function createVillageNodeEffects({ renderer, trackMaterial = () => {}, trackGeometry = () => {}, resolveTexture = value => value } = {}) {
  const materials = new Set(), geometries = new Set(), bindings = new Set(), bufferBindings = new Set(), descriptors = new Map(), cache = new Map(), owners = new WeakMap();
  const stats = { materials: 0, geometries: 0, pointsDraws: 0, fallbackTextures: 0, bindings: 0, bufferBindings: 0, families: {} };
  let fallback = null, disposed = false, currentOwner = null;
  function addBinding(fn, buffer = false) {
    (buffer ? bufferBindings : bindings).add(fn);
    (buffer ? currentOwner?.buffers : currentOwner?.bindings)?.add(fn);
    stats.bindings = bindings.size; stats.bufferBindings = bufferBindings.size;
  }
  function removeOwner(owner) {
    for (const fn of owner.bindings) bindings.delete(fn);
    for (const fn of owner.buffers) bufferBindings.delete(fn);
    if (owner.material && materials.delete(owner.material)) owner.material.dispose();
    if (owner.geometry && geometries.delete(owner.geometry)) owner.geometry.dispose();
    if (owner.sourceMaterial) {
      const sources = cache.get(owner.sourceMaterial);
      if (sources?.get(owner.mesh) === owner.material) sources.delete(owner.mesh);
      if (sources?.size === 0) cache.delete(owner.sourceMaterial);
    }
    if (owner.descriptor && descriptors.get(owner.mesh) === owner.descriptor) descriptors.delete(owner.mesh);
    stats.materials = materials.size; stats.geometries = geometries.size; stats.pointsDraws = descriptors.size;
    stats.bindings = bindings.size; stats.bufferBindings = bufferBindings.size;
  }
  // Every per-mesh conversion owns its bindings. Shared legacy sources never
  // imply shared GPU materials: instance nodes and point descriptors are local.
  function withOwner(mesh, sourceMaterial, build) {
    const previous = currentOwner, owner = { mesh, sourceMaterial, bindings: new Set(), buffers: new Set() };
    currentOwner = owner;
    try {
      const value = build(owner);
      if (!value) { removeOwner(owner); return value; }
      let entries = owners.get(mesh);
      if (!entries) owners.set(mesh, entries = new Set());
      entries.add(owner);
      return value;
    } catch (error) { removeOwner(owner); throw error; }
    finally { currentOwner = previous; }
  }
  function bindUniform(ref, type) {
    if (!ref) throw new Error('Village node effect is missing a required source uniform');
    if (type === 'texture') {
      if (!fallback) {
        fallback = new GPU.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
        fallback.needsUpdate = true;
        stats.fallbackTextures = 1;
      }
      const node = T.texture(resolveTexture(ref.value) || fallback);
      addBinding(() => { node.value = resolveTexture(ref.value) || fallback; });
      return node;
    }
    const value = ref.value?.clone ? ref.value.clone() : ref.value;
    const node = T.uniform(value, type);
    addBinding(() => {
      if (node.value?.copy && ref.value) node.value.copy(ref.value);
      else node.value = ref.value;
    });
    return node;
  }
  function ownMaterial(material, family) {
    materials.add(material); stats.materials = materials.size;
    if (currentOwner) currentOwner.material = material;
    stats.families[family] = (stats.families[family] || 0) + 1;
    material.userData.villageNodeEffect = family;
    trackMaterial(material);
    return material;
  }
  function instanceNodes(mesh) {
    // A custom vertexNode skips NodeMaterial's automatic instance transform.
    // Bind the source matrix once, apply it exactly once, and mirror its version.
    const source = mesh.instanceMatrix;
    const data = new GPU.InstancedInterleavedBuffer(source.array, 16, 1).setUsage(source.usage);
    const attribute = source.usage === GPU.DynamicDrawUsage ? T.instancedDynamicBufferAttribute : T.instancedBufferAttribute;
    const matrix = T.mat4(...[0, 4, 8, 12].map(offset => attribute(data, 'vec4', 16, offset)));
    addBinding(() => {
      if (mesh.instanceMatrix.array !== data.array) throw new Error('Village effect instance capacity changed; rebuild its mirror');
      data.version = mesh.instanceMatrix.version;
    }, true);
    let tint = T.vec3(1);
    if (mesh.instanceColor) {
      const sourceColor = mesh.instanceColor;
      const colour = new GPU.InstancedBufferAttribute(sourceColor.array, 3).setUsage(sourceColor.usage);
      const colourAttribute = sourceColor.usage === GPU.DynamicDrawUsage ? T.instancedDynamicBufferAttribute : T.instancedBufferAttribute;
      tint = colourAttribute(colour, 'vec3', 3, 0);
      addBinding(() => {
        if (mesh.instanceColor.array !== colour.array) throw new Error('Village effect colour capacity changed; rebuild its mirror');
        colour.version = mesh.instanceColor.version;
      }, true);
    }
    return { matrix, tint };
  }
  function instancedMaterial(source, mesh, family) {
    const material = new GPU.NodeMaterial();
    material.name = `${source.name || family}:webgpu`;
    for (const key of FLAGS) material[key] = source[key];
    const { matrix, tint } = instanceNodes(mesh), u = source.uniforms;
    const uv = T.varyingProperty('vec2', 'villageEffectUv');
    const fade = T.varyingProperty('float', 'villageEffectFade');
    const colour = T.varyingProperty('vec3', 'villageEffectColour');
    const contactAlpha = T.varyingProperty('float', 'villageContactAlpha');
    const haze = u.haze || u.airHaze ? bindUniform(u.haze || u.airHaze, 'float') : null;
    const time = u.time || u.airTime ? bindUniform(u.time || u.airTime, 'float') : null;
    const size = u.size ? bindUniform(u.size, 'float') : null;
    const strength = u.strength ? bindUniform(u.strength, 'float') : null;
    const reach = u.reach ? bindUniform(u.reach, 'vec2') : null;
    const tree = u.airTreeVisibility ? bindUniform(u.airTreeVisibility, 'float') : null;
    const attenuation = distance => T.exp(haze.mul(haze).mul(distance.mul(distance)).negate());
    material.vertexNode = T.Fn(() => {
      uv.assign(T.uv());
      if (family === 'contact') {
        const local = matrix.mul(T.vec4(T.positionGeometry.x, 0, T.positionGeometry.y.negate(), 1));
        // positionView (used by the standard fog node) must describe the flat,
        // already-instanced contact, rather than the original upright quad.
        T.positionLocal.assign(local.xyz);
        const mv = T.modelViewMatrix.mul(local).toVar();
        T.positionView.assign(mv.xyz);
        contactAlpha.assign(T.attribute('contactOpacity', 'float'));
        return T.cameraProjectionMatrix.mul(mv);
      }
      if (family === 'halo' || family === 'pool') {
        colour.assign(tint);
        if (family === 'pool') {
          const local = matrix.mul(T.vec4(T.positionGeometry.x.mul(size), 0, T.positionGeometry.y.mul(size).negate(), 1));
          const center = T.modelViewMatrix.mul(matrix.mul(T.vec4(0, 0, 0, 1)));
          const distance = center.xyz.length();
          fade.assign(attenuation(distance).mul(T.smoothstep(reach.x, reach.y, distance)));
          return T.cameraProjectionMatrix.mul(T.modelViewMatrix.mul(local));
        }
        const center = T.modelViewMatrix.mul(matrix.mul(T.vec4(0, 0, 0, 1))).toVar();
        const grow = matrix.element(0).xyz.length();
        const breath = T.sin(time.mul(2.7).add(T.attribute('seed', 'float').mul(40))).mul(.05).add(1);
        center.xy.addAssign(T.positionGeometry.xy.mul(size).mul(grow).mul(breath));
        const distance = center.z.negate();
        fade.assign(attenuation(distance).mul(T.smoothstep(.6, 2.4, distance)));
        return T.cameraProjectionMatrix.mul(center);
      }
      const seed = T.attribute('airSeed', 'float');
      const center = T.modelWorldMatrix.mul(matrix.mul(T.vec4(0, 0, 0, 1))).xyz.toVar();
      if (family === 'shaft') {
        const view = T.cameraViewMatrix;
        const right = T.vec3(view.element(0).element(0), 0, view.element(2).element(0)).normalize();
        const width = matrix.element(0).xyz.length(), height = matrix.element(1).xyz.length();
        const p = center.add(right.mul(T.positionGeometry.x).mul(width).mul(T.float(1).sub(T.positionGeometry.y.mul(.45))))
          .add(T.vec3(.16, 1, .06).mul(T.positionGeometry.y).mul(height));
        const mv = view.mul(T.vec4(p, 1));
        const distance = mv.xyz.length();
        fade.assign(attenuation(distance).mul(T.smoothstep(3, 8, distance)).mul(T.float(1).sub(T.smoothstep(35, 62, distance)))
          .mul(T.mix(1, tree, T.attribute('airTree', 'float'))).mul(T.sin(time.mul(.19).add(seed.mul(8))).mul(.06).add(.94)));
        return T.cameraProjectionMatrix.mul(mv);
      }
      const phase = seed.mul(24).add(time.mul(seed.mul(.12).add(.31))).toVar();
      center.addAssign(T.vec3(T.sin(phase).mul(.64), T.sin(phase.mul(1.37)).mul(.33), T.cos(phase.mul(.83)).mul(.57)));
      const mv = T.cameraViewMatrix.mul(T.vec4(center, 1)).toVar();
      mv.xy.addAssign(T.positionGeometry.xy.mul(matrix.element(0).xyz.length()));
      const distance = mv.xyz.length();
      fade.assign(attenuation(distance).mul(T.smoothstep(1.5, 4, distance)).mul(T.float(1).sub(T.smoothstep(28, 52, distance)))
        .mul(T.sin(phase.mul(1.7)).mul(.12).add(.50)));
      colour.assign(T.mix(T.vec3(1, .57, .18), T.vec3(1, .83, .44), seed));
      return T.cameraProjectionMatrix.mul(mv);
    })();
    material.fragmentNode = T.Fn(() => {
      if (family === 'contact') {
        const q = uv.mul(2).sub(1), radius = q.dot(q).toVar();
        radius.greaterThanEqual(1).discard();
        const falloff = T.float(1).sub(radius);
        return T.vec4(.018, .012, .025, falloff.mul(falloff).mul(contactAlpha));
      }
      if (family === 'shaft') {
        const edge = uv.x.sub(.5).abs().mul(2);
        const ribbon = T.float(1).sub(T.smoothstep(.08, 1, edge));
        const end = T.smoothstep(0, .2, uv.y).mul(T.float(1).sub(T.smoothstep(.72, 1, uv.y)));
        return T.vec4(T.vec3(.59, .53, .40).mul(ribbon.mul(ribbon)).mul(end).mul(fade).mul(.027), 1);
      }
      if (family === 'air-fly') {
        const q = uv.sub(.5).mul(2), radius = q.dot(q).toVar();
        radius.greaterThan(1).discard();
        const falloff = T.float(1).sub(radius);
        return T.vec4(colour.mul(falloff.mul(falloff)).mul(fade), 1);
      }
      const radius = uv.sub(.5).length().mul(2);
      let alpha = T.pow(T.max(0, T.float(1).sub(radius)), family === 'pool' ? 1.8 : 2.4);
      if (family === 'halo') alpha = alpha.add(T.pow(T.max(0, T.float(1).sub(radius.mul(2.6))), 2).mul(.35));
      return T.vec4(colour.mul(alpha).mul(strength).mul(fade), 1);
    })();
    return material;
  }
  return {
    stats,
    convert(sourceMaterial, sourceMesh) {
      if (disposed) throw new Error('Village node effects are disposed');
      const family = familyOf(sourceMaterial, sourceMesh);
      if (!family) return null;
      let sources = cache.get(sourceMaterial);
      if (!sources) cache.set(sourceMaterial, sources = new Map());
      if (sources.has(sourceMesh)) return sources.get(sourceMesh);
      return withOwner(sourceMesh ?? sourceMaterial, sourceMaterial, owner => {
        // A standalone sky conversion uses its material as the lease key.
        owner.mesh = sourceMesh;
        const result = family === 'sky' ? createVillageSkyNodeMaterial(sourceMaterial, bindUniform) : instancedMaterial(sourceMaterial, sourceMesh, family);
        ownMaterial(result, family); sources.set(sourceMesh, result);
        return result;
      });
    },
    convertObject(sourceMesh) {
      if (disposed) throw new Error('Village node effects are disposed');
      if (!sourceMesh?.isPoints) return null;
      if (descriptors.has(sourceMesh)) return descriptors.get(sourceMesh);
      return withOwner(sourceMesh, null, owner => {
        const descriptor = createVillagePointsDescriptor(sourceMesh, bindUniform, { renderer });
        if (!descriptor) return null;
        owner.geometry = descriptor.geometry; owner.descriptor = descriptor;
        ownMaterial(descriptor.material, descriptor.material.userData.villageNodePoints.family);
        geometries.add(descriptor.geometry); stats.geometries = geometries.size;
        trackGeometry(descriptor.geometry); descriptors.set(sourceMesh, descriptor); stats.pointsDraws = descriptors.size;
        return descriptor;
      });
    },
    releaseObject(sourceMesh) {
      for (const owner of owners.get(sourceMesh) ?? []) removeOwner(owner);
      owners.delete(sourceMesh);
    },
    sync() {
      if (disposed) return;
      for (const update of bindings) update();
      for (const update of bufferBindings) update();
      for (const descriptor of descriptors.values()) descriptor.sync();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const material of materials) material.dispose();
      for (const geometry of geometries) geometry.dispose();
      fallback?.dispose();
      bindings.clear(); bufferBindings.clear();
      cache.clear(); descriptors.clear(); materials.clear(); geometries.clear();
      stats.materials = stats.geometries = stats.pointsDraws = 0;
      stats.bindings = stats.bufferBindings = 0;
    },
  };
}
