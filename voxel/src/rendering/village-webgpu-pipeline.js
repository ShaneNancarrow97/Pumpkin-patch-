import * as GPU from "three/webgpu";
import { createVillageNodeMaterials } from "./village-node-materials.js";
import { createVillageGpuMirror } from "./village-webgpu-mirror.js";
import { canonicalizeVillageWgsl } from "./village-wgsl-cache.js";
import { createVillageShadowBudget } from "./village-shadow-budget.js";
import { villagePostProfile, scaleVillageGrade } from "../village-graphics.js";

// HDR bloom replaces the WebGL composer. Tone mapping and sRGB conversion run
// exactly once, followed by the existing display-space village grade. The DOM
// interface is intentionally outside this pipeline and is never blurred.
export async function createVillageWebGpuPipeline({ canvas, onFailure }) {
  let renderer = null, materials = null, mirror = null, scenePass = null, glow = null, post = null, device = null, uncaptured = null, disposed = false;
  const aaTargets = [];
  // Initialization can fail after the device exists but before an API can be
  // returned. Retire every successfully created resource in that case too.
  function dispose() {
    if (disposed) return; disposed = true;
    device ??= renderer?.backend?.device;
    device?.removeEventListener?.("uncapturederror", uncaptured);
    const cleanups = [() => {
      // r169 PostProcessing keeps a module-global fullscreen material. Clear
      // its graph too, otherwise it retains this retired village and textures.
      if (post) { post.outputNode = GPU.vec4(0, 0, 0, 1); post.needsUpdate = true; post.update(); }
    }, () => scenePass?.dispose(), () => glow?.dispose(),
      ...aaTargets.map(t => () => t.dispose()), () => mirror?.dispose(),
      () => materials?.dispose(), () => renderer?.dispose(), () => device?.destroy()];
    // A device which is already lost can reject an individual disposal. Keep
    // releasing the rest, especially the exclusively owned GPUDevice. This
    // never dispatches dispose on the legacy scene's geometry or textures.
    for (const cleanup of cleanups) { try { cleanup(); } catch { /* terminal cleanup continues */ } }
  }
  try {
  renderer = new GPU.WebGPURenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  await renderer.init(); device = renderer.backend.device;
  if (!renderer.backend.isWebGPUBackend) throw new Error("Renderer selected a non-WebGPU backend");
  // r169 starts a bookkeeping RAF even with no animation callback. The game
  // already owns a paced RAF; advance its node frame once per actual draw here.
  if (typeof renderer._animation?.dispose !== "function" || typeof renderer._nodes?.nodeFrame?.update !== "function") throw new Error(`Unsupported Three ${GPU.REVISION} node-frame lifecycle`);
  renderer._animation.dispose();
  // Pinned r169 bakes global node IDs into otherwise identical UBO type and
  // variable names. Normalize only validated generated pairs before the stage
  // cache sees them; numeric group/binding slots and all calculations stay put.
  const shaderCache = { normalizedStages: 0, builders: 0 };
  const createNodeBuilder = renderer.backend.createNodeBuilder.bind(renderer.backend);
  renderer.backend.createNodeBuilder = (...args) => {
    const builder = createNodeBuilder(...args), build = builder.build;
    builder.build = function(...args) {
      const result = build.apply(this, args); shaderCache.builders++;
      for (const key of ["vertexShader", "fragmentShader"]) if (typeof this[key] === "string") {
        const normalized = canonicalizeVillageWgsl(this[key], GPU.REVISION);
        if (normalized !== this[key]) { this[key] = normalized; shaderCache.normalizedStages++; }
      }
      return result;
    };
    return builder;
  };
  const createTexture = renderer.backend.createTexture.bind(renderer.backend);
  renderer.backend.createTexture = (texture, options) => {
    try { return createTexture(texture, options); }
    catch (error) {
      const image = texture.image;
      error.message = `Village texture ${texture.name || texture.uuid} (${image?.constructor?.name ?? "missing image"}, ${image?.width}x${image?.height}, target:${!!texture.isRenderTargetTexture}, depth:${!!texture.isDepthTexture}, data:${!!texture.isDataTexture}): ${error.message}`;
      throw error;
    }
  };
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = GPU.PCFSoftShadowMap;
  renderer.toneMapping = GPU.ACESFilmicToneMapping; renderer.outputColorSpace = GPU.SRGBColorSpace;
  materials = createVillageNodeMaterials({ renderer }); mirror = createVillageGpuMirror(materials);
  scenePass = GPU.pass(mirror.scene, mirror.camera); const color = scenePass.getTextureNode("output");
  glow = GPU.bloom(color, .36, .55, .9);
  const saturation = GPU.uniform(1.1), contrast = GPU.uniform(1.05), vignette = GPU.uniform(.24);
  const gradeState = { saturation: 1, contrast: 1, vignette: 0, shadows: [0, 0, 0], lights: [0, 0, 0] };
  const shadowTint = GPU.uniform(new GPU.Vector3(.004, .006, .03)), lightTint = GPU.uniform(new GPU.Vector3(.02, .008, -.014));
  const display = GPU.renderOutput(color.add(glow), GPU.ACESFilmicToneMapping, GPU.SRGBColorSpace);
  const gradeFor = display => GPU.Fn(() => {
    const rgb = display.rgb.toVar(), l = GPU.dot(rgb, GPU.vec3(.2126, .7152, .0722));
    rgb.assign(GPU.mix(GPU.vec3(l), rgb, saturation)); rgb.assign(rgb.sub(.5).mul(contrast).add(.5));
    rgb.addAssign(shadowTint.mul(GPU.smoothstep(0, .5, l).oneMinus()).add(lightTint.mul(GPU.smoothstep(.5, 1, l))));
    const p = GPU.uv().sub(.5).mul(GPU.vec2(1, .92));
    rgb.mulAssign(GPU.smoothstep(.34, .86, p.length()).mul(vignette).oneMinus());
    return GPU.vec4(rgb.clamp(0, 1), display.a);
  })();
  const outputs = new Map([[false, gradeFor(display)]]);
  post = new GPU.PostProcessing(renderer, outputs.get(false)); post.outputColorTransform = false;
  let prepared = false, width = 1, height = 1, ratio = 1, renderFrames = 0;
  let inFlight = false, pendingFrame = null, completedFrames = 0, skippedSubmissions = 0;
  let frameStats = { calls: 0, triangles: 0, renderPasses: 0 };
  const shadowBudget = createVillageShadowBudget(), pendingShadows = new Set();
  let shadowContext = null, shadowRevision = null;
  let usePost = true, useAntialias = false, glowScale = 1, postProfile = villagePostProfile("balanced");
  const originalBloomSize = glow.setSize.bind(glow);
  glow.setSize = (w, h) => originalBloomSize(Math.max(1, Math.round(w * glowScale)), Math.max(1, Math.round(h * glowScale)));
  uncaptured = event => { if (!disposed) onFailure?.(new Error(`WebGPU validation: ${event.error?.message ?? "uncaptured device error"}`)); };
  device?.addEventListener?.("uncapturederror", uncaptured);
  device?.lost.then(info => { if (!disposed) onFailure?.(new Error(`WebGPU device lost: ${info.message || info.reason}`)); });
  function sync(source, camera, options = {}) {
    // A resized r169 depth target may retain its own refresh request. Capture
    // it before the mirror adds requests accumulated by skipped source ticks.
    pendingShadows.clear();
    for (const light of mirror.scene.children) if (light.castShadow && light.shadow?.needsUpdate) pendingShadows.add(light.userData.sourceUuid);
    mirror.sync(source, camera); renderer.toneMappingExposure = source.userData.exposure ?? 1.15;
    const shadows = options.shadows !== false;
    if (renderer.shadowMap.enabled !== shadows) {
      shadowBudget.invalidate();
      renderer.shadowMap.enabled = shadows;
      mirror.scene.traverse(object => {
        for (const material of [].concat(object.material ?? [])) material.needsUpdate = true;
        if (shadows && object.shadow) object.shadow.needsUpdate = true;
      });
    }
    const context = source.userData.villageShadowContext ?? source.uuid, revision = source.userData.villageShadowRevision ?? 0;
    if (context !== shadowContext || revision !== shadowRevision) { shadowBudget.invalidate(); shadowContext = context; shadowRevision = revision; }
    shadowBudget.beginFrame();
    if (shadows) for (const light of mirror.scene.children) {
      const shadow = light.shadow;
      if (!light.castShadow || !shadow || shadow.autoUpdate) continue;
      const p = light.matrixWorld.elements, t = light.target?.matrixWorld.elements ?? p;
      shadow.needsUpdate = shadowBudget.select(light.userData.sourceUuid, {
        requested: shadow.needsUpdate, rendererPending: pendingShadows.has(light.userData.sourceUuid),
        force: !!options.forceShadows || !!source.userData.villageShadowContinuous, context,
        shape: [shadow.mapSize.x, shadow.mapSize.y, shadow.bias, shadow.normalBias, shadow.radius, ...shadow.camera.projectionMatrix.elements],
        position: [p[12], p[13], p[14]], target: [t[12], t[13], t[14]],
      });
    }
    postProfile = villagePostProfile(options.postEffects);
    const g = scaleVillageGrade(source.userData.grade, postProfile.grade, gradeState);
    saturation.value = g.saturation; contrast.value = g.contrast; vignette.value = g.vignette;
    shadowTint.value.fromArray(g.shadows); lightTint.value.fromArray(g.lights);
    const b = source.userData.bloom ?? {};
    glow.strength.value = (b.strength ?? .36) * postProfile.bloom;
    glow.radius.value = b.radius ?? .55; glow.threshold.value = b.threshold ?? .9;
    usePost = options.bloom !== false && postProfile.enabled;
    glowScale = options.glowScale ?? 1;
    const antialias = !!options.antialias && !options.tvProfile;
    if (antialias !== useAntialias) {
      useAntialias = antialias;
      if (!outputs.has(antialias)) {
        const target = GPU.rtt(display); aaTargets.push(target);
        outputs.set(antialias, gradeFor(GPU.fxaa(target)));
      }
      post.outputNode = outputs.get(antialias); post.needsUpdate = true;
    }
  }
  // r169 PostProcessing temporarily changes renderer output state without a
  // finally. Guard it here so a failed node/pass cannot leak that state.
  function draw() {
    renderer._nodes.nodeFrame.update(); renderer.info.frame = renderer._nodes.nodeFrame.frameId;
    const toneMapping = renderer.toneMapping, output = renderer.outputColorSpace;
    const autoReset = renderer.info.autoReset, previousCalls = renderer.info.render.calls;
    renderer.info.autoReset = false; renderer.info.reset();
    try {
      if (usePost) post.render(); else renderer.render(mirror.scene, mirror.camera);
      renderFrames++; mirror.afterRender(); inFlight = true;
      pendingFrame = device.queue.onSubmittedWorkDone().then(() => { inFlight = false; completedFrames++; }, error => { inFlight = false; if (!disposed) onFailure?.(error); throw error; });
      // The first frame awaits this same fence; later frames report failure
      // through onFailure without an unhandled rejected promise.
      pendingFrame.catch(() => {});
    }
    finally { frameStats = { calls: renderer.info.render.drawCalls, triangles: renderer.info.render.triangles, renderPasses: renderer.info.render.calls - previousCalls }; renderer.info.autoReset = autoReset; renderer.toneMapping = toneMapping; renderer.outputColorSpace = output; }
  }
  return {
    async firstFrame(source, camera, options) {
      sync(source, camera, options); device.pushErrorScope("validation");
      // r169 compileAsync initializes shadow sampler bindings before the new
      // shadow render target has sized its DepthTexture. A normal first draw
      // runs shadow updateBefore in the right order and compiles the same real
      // pipelines. Validate that complete hidden frame before revealing it.
      try { draw(); await pendingFrame; }
      finally {
        const error = await device.popErrorScope();
        if (error) throw new Error(`WebGPU first-frame validation: ${error.message}`);
      }
      prepared = true;
    },
    render(source, camera, options) { if (disposed || !prepared) throw new Error("WebGPU presentation is not ready"); if (inFlight) { skippedSubmissions++; return false; } sync(source, camera, options); draw(); return true; },
    resize(w, h, r) { if (width === w && height === h && ratio === r) return; shadowBudget.invalidate(); width = w; height = h; ratio = r; renderer.setPixelRatio(r); renderer.setSize(w, h, false); scenePass.setPixelRatio(r); scenePass.setSize(w, h); },
    invalidateShadows() { shadowBudget.invalidate(); },
    stats() { return { actualBackend: "webgpu", renderFrames, completedFrames, inFlight, maxFramesInFlight: 1, skippedSubmissions, ...mirror.stats(), materials: materials.stats, ...frameStats, shadowBudget: { ...shadowBudget.stats }, shaderCache: { ...shaderCache, vertexPrograms: renderer._pipelines?.programs?.vertex?.size ?? 0, fragmentPrograms: renderer._pipelines?.programs?.fragment?.size ?? 0 }, textures: renderer.info.memory.textures, bufferWidth: canvas.width, bufferHeight: canvas.height, post: { effects: postProfile.id, bloomStrength: glow.strength.value, gradeAmount: postProfile.grade, hdr: usePost, bloom: usePost, shadows: renderer.shadowMap.enabled, displayGrade: usePost, fxaa: usePost && useAntialias, glowScale, toneMapping: "ACES", output: "sRGB" } }; },
    dispose,
  };
  } catch (error) { dispose(); throw error; }
}
