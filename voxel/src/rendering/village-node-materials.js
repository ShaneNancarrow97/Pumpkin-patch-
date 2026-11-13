import * as GPU from "three/webgpu";
import * as T from "three/tsl";
import * as GL from "three";
import { VILLAGE_GRASS_FADE } from "../village-visibility.js";
import { VILLAGE_DETAIL_DISTANCE as DETAIL } from "../village-distance-detail.js";
import { nodeFinish, nodeAlphaHash, nodeWaterNormal, nodeGrassDeform, nodeAoCorner, nodePbrClassify, nodePbrTangentNormal } from "./village-node-surface-functions.js";
import { createVillageNodeEffects } from "./village-node-effects.js";
import { createVillageNodeTextures } from "./village-node-textures.js";
class UnsupportedVillageMaterial extends Error {
  constructor(material, mesh, reason) {
    super(`Unported village material ${material?.name || material?.type || "missing"} on ${mesh?.name || mesh?.uuid || "object"}: ${reason}`);
    this.name = "UnsupportedVillageMaterial";
    this.materialId = material?.uuid;
    this.reason = reason;
  }
}
const scalarKeys = ["opacity", "transparent", "alphaTest", "alphaToCoverage", "side", "shadowSide", "depthTest", "depthWrite", "depthFunc", "colorWrite", "blending", "blendSrc", "blendDst", "blendEquation", "blendSrcAlpha", "blendDstAlpha", "blendEquationAlpha", "premultipliedAlpha", "polygonOffset", "polygonOffsetFactor", "polygonOffsetUnits", "roughness", "metalness", "shininess", "emissiveIntensity", "normalMapType", "flatShading", "vertexColors", "fog", "toneMapped", "wireframe", "visible"];
const textureKeys = ["map", "alphaMap", "emissiveMap", "normalMap", "roughnessMap", "metalnessMap", "aoMap", "specularMap", "envMap", "lightMap"];
function copyProperties(source, target, resolveTexture = (x) => x) {
  for (const key of scalarKeys) if (source[key] !== void 0) target[key] = source[key];
  for (const key of textureKeys) if (key in source) target[key] = source[key] ? resolveTexture(source[key]) : null;
  for (const key of ["color", "emissive", "specular", "normalScale"]) if (source[key] && target[key]?.copy) target[key].copy(source[key]);
}
function captureShader(source, renderer) {
  const key = source.isMeshStandardMaterial ? "standard" : source.isMeshLambertMaterial ? "lambert" : source.isMeshPhongMaterial ? "phong" : source.isSpriteMaterial ? "sprite" : source.isLineBasicMaterial ? "basic" : "basic";
  const library = GL.ShaderLib[key];
  const shader = { uniforms: {}, vertexShader: library.vertexShader, fragmentShader: library.fragmentShader };
  source.onBeforeCompile?.(shader, renderer);
  return shader;
}
function createVillageNodeMaterials({ renderer } = {}) {
  // Source materials remain the authoritative legacy/atlas view. Variants are
  // owned per material + mesh, with layout-based reuse across directional frames.
  const instances = /* @__PURE__ */ new WeakMap();
  const owned = /* @__PURE__ */ new Set(), entries = /* @__PURE__ */ new Set(), cache = /* @__PURE__ */ new WeakMap(), bindings = /* @__PURE__ */ new Set(), derived = /* @__PURE__ */ new Set();
  let disposed = false;
  const stats = { ready: true, converted: 0, effectMaterials: 0, unsupported: 0, roles: {}, derivedInstanceBytes: 0 };
  const textures = createVillageNodeTextures(), resolveTexture = textures.resolve;
  const effects = createVillageNodeEffects({ renderer, resolveTexture });
  let currentBindings = null;
  const addBinding = (fn) => {
    bindings.add(fn);
    currentBindings?.add(fn);
  };
  const layout = (mesh) => Object.entries(mesh?.geometry?.attributes ?? {}).sort(([a], [b]) => a.localeCompare(b)).map(([name, a]) => `${name}:${a.itemSize}:${!!a.normalized}:${!!a.isInstancedBufferAttribute}`).join("|") + `|instances:${!!mesh?.instanceMatrix}|colours:${!!mesh?.instanceColor}`;
  function retire(entry) {
    for (const fn of entry.bindings ?? []) bindings.delete(fn);
    entries.delete(entry);
    owned.delete(entry.material);
    entry.material.dispose();
  }
  const lampNear = T.uniform(0);
  let lampNearRef = null;
  class VillagePointLightNode extends GPU.PointLightNode {
    setup(builder) {
      const vector = T.lightViewPosition(this.light).sub(T.positionView), distance = vector.length();
      const near = builder.material.userData?.villageFinished ? lampNear : T.float(0);
      const falloff = distance.max(near).pow(this.decayExponentNode).max(0.01).reciprocal();
      const atten = this.cutoffDistanceNode.greaterThan(0).select(falloff.mul(distance.div(this.cutoffDistanceNode).pow(4).oneMinus().clamp().pow(2)), falloff);
      builder.context.lightingModel.direct({ lightDirection: vector.normalize(), lightColor: this.colorNode.mul(atten), reflectedLight: builder.context.reflectedLight }, builder.stack, builder);
    }
  }
  const oldPoint = renderer?.nodes?.library?.lightNodes?.get(GPU.PointLight);
  if (renderer?.nodes?.library?.lightNodes) renderer.nodes.library.lightNodes.set(GPU.PointLight, VillagePointLightNode);
  function bind(ref, type) {
    const node = T.uniform(ref?.value ?? 0, type);
    addBinding(() => {
      node.value = ref.value;
    });
    return node;
  }
  function role(name) {
    stats.roles[name] = (stats.roles[name] ?? 0) + 1;
  }
  function own(material, source, mesh) {
    owned.add(material);
    const entry = { source, material, mesh, bindings: currentBindings, version: source.version, layout: layout(mesh) };
    entries.add(entry);
    currentBindings = null;
    stats.converted++;
    return entry;
  }
  function instanceData(mesh, kind) {
    if (!mesh?.instanceMatrix) return T.vec3(kind === "scale" ? 1 : 0);
    let slots = instances.get(mesh);
    if (!slots) {
      slots = /* @__PURE__ */ new Map();
      instances.set(mesh, slots);
    }
    if (slots.has(kind)) return slots.get(kind).node;
    const array = new Float32Array(mesh.instanceMatrix.count * 3), attribute = new GPU.InstancedBufferAttribute(array, 3);
    attribute.setUsage(GPU.DynamicDrawUsage);
    const node = T.instancedBufferAttribute(attribute, "vec3");
    const record = { mesh, kind, array, attribute, node, version: -1 };
    slots.set(kind, record);
    derived.add(record);
    stats.derivedInstanceBytes += array.byteLength;
    updateDerived(record);
    return node;
  }
  function updateDerived(record) {
    const matrix = record.mesh.instanceMatrix;
    if (record.version === matrix.version) return;
    record.version = matrix.version;
    const a = matrix.array;
    for (let i = 0; i < matrix.count; i++) {
      const o = i * 16, p = i * 3;
      if (record.kind === "root") {
        record.array[p] = a[o + 12];
        record.array[p + 1] = a[o + 13];
        record.array[p + 2] = a[o + 14];
      } else {
        record.array[p] = Math.hypot(a[o], a[o + 1], a[o + 2]);
        record.array[p + 1] = Math.hypot(a[o + 4], a[o + 5], a[o + 6]);
        record.array[p + 2] = Math.hypot(a[o + 8], a[o + 9], a[o + 10]);
      }
    }
    record.attribute.needsUpdate = true;
  }
  function surfaceCoordinates(mesh) {
    return { position: T.varying(T.positionLocal), normal: T.varying(T.normalLocal).normalize(), local: T.varying(T.positionGeometry), scale: T.varying(instanceData(mesh, "scale")), modelScale: T.modelWorldMatrix.element(T.int(0)).xyz.length().max(1e-4) };
  }
  function generic(source, mesh) {
    let material;
    if (source.isMeshPhysicalMaterial) material = new GPU.MeshPhysicalNodeMaterial();
    else if (source.isMeshStandardMaterial) material = new GPU.MeshStandardNodeMaterial();
    else if (source.isMeshPhongMaterial) material = new GPU.MeshPhongNodeMaterial();
    else if (source.isMeshLambertMaterial) material = new GPU.MeshLambertNodeMaterial();
    else if (source.isMeshBasicMaterial) material = new GPU.MeshBasicNodeMaterial();
    else if (source.isSpriteMaterial) material = new GPU.SpriteNodeMaterial();
    else if (source.isLineBasicMaterial) material = new GPU.LineBasicNodeMaterial();
    else throw new UnsupportedVillageMaterial(source, mesh, "unsupported base material");
    copyProperties(source, material, resolveTexture);
    material.name = `GPU:${source.name || source.type}`;
    return material;
  }
  function convert(source, mesh) {
    if (disposed) throw new Error("Village material bridge is disposed");
    if (!source) throw new UnsupportedVillageMaterial(source, mesh, "missing material");
    let byMesh = cache.get(source);
    if (!byMesh) {
      byMesh = /* @__PURE__ */ new WeakMap();
      cache.set(source, byMesh);
    }
    const cacheObject = mesh ?? source;
    const previous = byMesh.get(cacheObject);
    if (previous) {
      if (previous.effect || previous.version === source.version && previous.layout === layout(mesh)) return previous.material;
      retire(previous);
      byMesh.delete(cacheObject);
    }
    currentBindings = /* @__PURE__ */ new Set();
    if (source.isShaderMaterial) {
      const result = effects.convert(source, mesh);
      if (!result) {
        stats.unsupported++;
        stats.ready = false;
        throw new UnsupportedVillageMaterial(source, mesh, "unknown custom shader");
      }
      byMesh.set(cacheObject, { material: result, effect: true });
      currentBindings = null;
      stats.effectMaterials++;
      return result;
    }
    const shader = captureShader(source, renderer), key = source.customProgramCacheKey?.() ?? "", data = source.userData ?? {};
    const finish = !!data.voxelFinish, grass = key.includes("village-grass-distance"), water = !!data.villageWater, ground = !!data.grassDetail, native = !!shader.uniforms.neighbourhoodVisibility;
    // crispen can expand the emissive include before a later moon-rim hook
    // attempts to patch it. Match the composed GL picture, not dormant metadata.
    const crisp = key.includes("crisp-sprite"), rim = !!data.villageRim, moon = !!data.moonRim && shader.fragmentShader.includes("totalEmissiveRadiance += rimColour * rimStrength"), voxelCast = shader.fragmentShader.includes("totalEmissiveRadiance += vColor.rgb * 0.28");
    const known = finish || grass || water || ground || native || crisp || rim || moon || voxelCast || !!data.voxelAO || !!data.voxelPbr;
    const custom = source.onBeforeCompile !== GL.Material.prototype.onBeforeCompile;
    if (custom && !known) {
      stats.unsupported++;
      stats.ready = false;
      throw new UnsupportedVillageMaterial(source, mesh, `unknown shader hook (${key.slice(0, 90)})`);
    }
    const material = generic(source, mesh);
    // Owners swap between standing, directional-walk and action atlases without
    // changing material identity. Explicit TSL samples must follow those maps,
    // just as material.map does; capturing the initial texture freezes the art
    // on WebGPU even though the shared actor continues advancing its UV frames.
    const liveTextures = new Map();
    function materialTexture(key, uv = T.uv()) {
      let node = liveTextures.get(key);
      if (!node) {
        node = T.texture(resolveTexture(source[key]), T.uv());
        liveTextures.set(key, node);
        addBinding(() => { if (source[key]) node.value = resolveTexture(source[key]); });
      }
      return node.uv(uv);
    }
    let colour = T.materialColor, emissive = T.materialEmissive, normal = T.normalView, ao = T.float(1);
    const instColor = mesh?.instanceColor ? T.varyingProperty("vec3", "vInstanceColor") : T.vec3(1);
    const authored = T.materialColor.rgb.mul(instColor);
    let coordinates = null;
    if (finish) {
      role("finish");
      material.userData.villageFinished = true;
      coordinates = surfaceCoordinates(mesh);
      const pitch = bind(shader.uniforms.finPitch, "float");
      lampNearRef = shader.uniforms.finNear;
      const factor = nodeFinish(authored, coordinates.position, coordinates.normal, coordinates.local, coordinates.scale, pitch.div(coordinates.modelScale), T.float(source.isMeshBasicMaterial ? 1 : 0));
      colour = colour.mul(T.vec4(factor, 1));
    }
    if (ground) {
      role("ground-detail");
      const texture = shader.uniforms.grassDetailMap, strength = bind(shader.uniforms.grassDetailStrength, "float"), scale = bind(shader.uniforms.grassDetailScale, "float");
      const tile = T.texture(resolveTexture(texture.value), T.positionWorld.xz.div(scale));
      addBinding(() => {
        tile.value = resolveTexture(texture.value);
      });
      const coverage = materialTexture("map").a.mul(T.step(0.75, T.varying(T.normalGeometry).y));
      colour = T.vec4(T.mix(T.materialColor.rgb, tile.rgb, coverage.mul(strength)), 1);
      material.opacity = source.opacity;
    }
    if (water) {
      role("water");
      const time = bind(shader.uniforms.villageWaterTime, "float"), worldNormal = nodeWaterNormal(T.positionWorld.xz, time);
      normal = T.cameraViewMatrix.mul(T.vec4(worldNormal, 0)).xyz.normalize();
      material.normalNode = normal;
      const grazing = T.float(1).sub(normal.mul(T.faceDirection).dot(T.positionViewDirection).clamp(0, 1));
      emissive = emissive.add(T.vec3(0.028, 0.032, 0.031).mul(grazing.pow(3)));
    }
    if (crisp && source.map) {
      role("crisp-sprite");
      const sampled = materialTexture("map").bias(-0.85);
      colour = T.vec4(T.uniform(source.color, "color").mul(sampled.rgb), sampled.a);
      if (source.emissiveMap) {
        const intensity = T.uniform(source.emissiveIntensity);
        addBinding(() => {
          intensity.value = source.emissiveIntensity;
        });
        emissive = T.uniform(source.emissive, "color").mul(intensity).mul(materialTexture("emissiveMap").bias(-0.85).rgb);
      }
    }
    if (rim && source.map) {
      role("sprite-rim");
      const step = T.uniform(new GPU.Vector2(...data.villageRim.texel));
      const alpha = (offset) => materialTexture("map", T.uv().add(offset)).bias(-0.85).a;
      const neighbour = T.min(T.min(alpha(T.vec2(step.x, 0)), alpha(T.vec2(step.x.negate(), 0))), T.min(alpha(T.vec2(0, step.y)), alpha(T.vec2(0, step.y.negate()))));
      emissive = emissive.add(T.vec3(0.26, 0.18, 0.105).mul(T.smoothstep(0.05, 0.7, T.float(1).sub(neighbour))));
    }
    if (moon && source.map) {
      role("moon-rim");
      const u = data.moonRim, tint = bind(u.colour, "color"), strength = bind(u.strength, "float"), width = bind(u.width, "float");
      const step = T.vec2(width).div(T.textureSize(materialTexture("map"), 0));
      const alpha = (offset) => materialTexture("map", T.uv().add(offset)).a;
      const up = T.float(1).sub(alpha(T.vec2(0, step.y))), side = T.float(2).sub(alpha(T.vec2(step.x, 0))).sub(alpha(T.vec2(step.x.negate(), 0))), high = T.float(1).sub(alpha(T.vec2(0, step.y.mul(2.2))));
      emissive = emissive.add(tint.mul(strength).mul(up.mul(0.7).add(high.mul(0.45)).add(side.mul(0.3)).clamp(0, 1)));
    }
    if (voxelCast) {
      role("voxel-cast");
      emissive = emissive.add(T.attribute("color", "vec3").mul(0.28));
    }
    if (data.voxelAO && mesh.geometry.hasAttribute(data.voxelAO.attribute ?? "voxelAO")) {
      role("voxel-ao");
      const corner = nodeAoCorner(T.attribute("voxelAO", "vec2"), T.positionGeometry, T.normalGeometry);
      ao = ao.mul(T.float(1).sub(T.varying(corner).mul(data.voxelAO.strength)));
    }
    if (data.voxelPbr) {
      role("pbr-atlas");
      coordinates ??= surfaceCoordinates(mesh);
      const p = data.voxelPbr;
      const surface = T.varying(nodePbrClassify(T.uniform(source.color, "color").mul(instColor))), world = coordinates.position.mul(coordinates.modelScale), n = coordinates.normal.abs();
      const face = n.y.greaterThan(0.5).select(world.xz, n.x.greaterThan(0.5).select(world.zy, world.xy));
      const unwrapped = face.mul(p.repeat);
      const offset = T.vec2(T.mod(surface.x, 2), surface.x.div(2).floor()).mul(0.5);
      const uv = offset.add(p.gutter / p.size).add(unwrapped.fract().mul(p.body / p.size));
      const pixel = T.max(unwrapped.dFdx().length(), unwrapped.dFdy().length());
      const weight = surface.y.mul(T.float(1).sub(T.smoothstep(0.15, 0.5, pixel)));
      const dx = unwrapped.dFdx().mul(p.body / p.size), dy = unwrapped.dFdy().mul(p.body / p.size);
      const albedo = T.texture(resolveTexture(p.albedo), uv).grad(dx, dy), orm = T.texture(resolveTexture(p.orm), uv).grad(dx, dy);
      colour = colour.mul(T.vec4(T.mix(T.vec3(1), albedo.rgb, weight.mul(p.strength)), 1));
      material.roughnessNode = T.mix(T.materialRoughness, orm.g, weight.mul(0.65));
      material.metalnessNode = T.mix(T.materialMetalness, orm.b, weight.mul(0.55));
      const mapN = T.texture(resolveTexture(p.normal), uv).grad(dx, dy).xyz.mul(2).sub(1), adjusted = T.vec3(mapN.xy.mul(p.normalStrength).mul(weight), mapN.z);
      normal = nodePbrTangentNormal(adjusted, unwrapped, normal, T.positionView, T.faceDirection);
      material.normalNode = normal;
      ao = ao.mul(T.mix(1, orm.r, weight));
    }
    let visibility = T.uniform(source.opacity);
    addBinding(() => {
      visibility.value = source.opacity;
    });
    if (native) {
      role("native-fade");
      const array = T.uniformArray(shader.uniforms.neighbourhoodVisibility.value, "float"), enabled = bind(shader.uniforms.neighbourhoodFadeEnabled, "float");
      addBinding(() => {
        array.array = shader.uniforms.neighbourhoodVisibility.value;
      });
      const perInstance = T.mix(1, array.element(T.int(T.attribute("neighbourhoodBlocker", "float").add(0.5))), enabled);
      visibility = visibility.mul(T.varying(perInstance));
    }
    if (grass) {
      role("grass");
      const u = shader.uniforms, time = bind(u.uTime, "float"), player = bind(u.uGrassPlayer, "vec2"), camera = bind(u.uGrassCamera, "vec2"), root = instanceData(mesh, "root"), worldRoot = T.modelWorldMatrix.mul(T.vec4(root, 1)), tip = T.attribute("tip", "float");
      const vis = T.smoothstep(VILLAGE_GRASS_FADE.playerNear, VILLAGE_GRASS_FADE.playerFar, worldRoot.xz.distance(player)).mul(T.smoothstep(VILLAGE_GRASS_FADE.cameraNear, VILLAGE_GRASS_FADE.cameraFar, worldRoot.xz.distance(camera)));
      const distance = worldRoot.xz.distance(camera), detail = T.attribute("bladeDetail", "float");
      const far = T.float(1).sub(T.smoothstep(DETAIL.grassFarFrom, DETAIL.grassFarTo, distance));
      const fine = T.float(1).sub(T.smoothstep(DETAIL.grassNearFrom, DETAIL.grassNearTo, distance));
      const middle = T.float(1).sub(T.smoothstep(DETAIL.grassMiddleFrom, DETAIL.grassMiddleTo, distance));
      const bladeFade = T.mix(T.mix(1, middle, T.step(.5, detail)), fine, T.step(1.5, detail));
      visibility = visibility.mul(T.varying(vis.mul(far).mul(bladeFade)));
      const vTip = T.varying(tip);
      colour = colour.mul(T.float(0.46).add(vTip.min(1).pow(2).mul(0.8))).mul(vTip.greaterThan(1.1).select(1.25, 1));
      material.setupPosition = function(builder) {
        builder.addStack();
        T.positionLocal.assign(nodeGrassDeform(T.positionGeometry, root, tip, time, vis));
        T.instance(builder.object).append();
        const mvp = T.modelViewProjection();
        builder.context.vertex = builder.removeStack();
        builder.context.mvp = mvp;
        return mvp;
      };
    }
    if (source.alphaHash || grass || native) {
      role("alpha-hash");
      const base = colour;
      colour = T.Fn(() => {
        visibility.lessThan(nodeAlphaHash(T.positionLocal)).discard();
        return base;
      })();
    }
    material.colorNode = colour;
    if (source.emissive) material.emissiveNode = emissive;
    if (source.isMeshStandardMaterial) material.aoNode = ao;
    if (source.map && source.alphaTest > 0) {
      const sample = materialTexture("map");
      material.shadowNode = T.Fn(() => {
        sample.a.lessThanEqual(source.alphaTest).discard();
        return T.vec4(0, 0, 0, 1);
      })();
      role("cutout-shadow");
    }
    const entry = own(material, source, mesh);
    byMesh.set(cacheObject, entry);
    return material;
  }
  return { convert, convertObject: (source) => effects.convertObject(source), sync() {
    if (disposed) return;
    for (const fn of bindings) fn();
    if (lampNearRef) lampNear.value = lampNearRef.value;
    for (const record of derived) updateDerived(record);
    for (const entry of entries) copyProperties(entry.source, entry.material, resolveTexture);
    effects.sync();
    textures.sync();
    stats.textureWrappers = textures.stats.wrappers;
  }, dispose() {
    if (disposed) return;
    disposed = true;
    effects.dispose();
    textures.dispose();
    for (const material of owned) material.dispose();
    owned.clear();
    entries.clear();
    bindings.clear();
    derived.clear();
    if (renderer?.nodes?.library?.lightNodes && oldPoint) renderer.nodes.library.lightNodes.set(GPU.PointLight, oldPoint);
  }, stats };
}
export {
  UnsupportedVillageMaterial,
  createVillageNodeMaterials
};
