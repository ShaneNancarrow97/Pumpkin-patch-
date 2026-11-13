import * as GPU from "three/webgpu";
import { createVillageNodeMaterials } from "./village-node-materials.js";
import { createVillageGpuMirror } from "./village-webgpu-mirror.js";

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
  let usePost = true, useAntialias = false, glowScale = 1;
  const originalBloomSize = glow.setSize.bind(glow);
  glow.setSize = (w, h) => originalBloomSize(Math.max(1, Math.round(w * glowScale)), Math.max(1, Math.round(h * glowScale)));
  uncaptured = event => { if (!disposed) onFailure?.(new Error(`WebGPU validation: ${event.error?.message ?? "uncaptured device error"}`)); };
  device?.addEventListener?.("uncapturederror", uncaptured);
  device?.lost.then(info => { if (!disposed) onFailure?.(new Error(`WebGPU device lost: ${info.message || info.reason}`)); });
  function sync(source, camera, options = {}) {
    mirror.sync(source, camera); renderer.toneMappingExposure = source.userData.exposure ?? 1.15;
    const g = source.userData.grade ?? {};
    saturation.value = g.saturation ?? 1; contrast.value = g.contrast ?? 1; vignette.value = g.vignette ?? 0;
    shadowTint.value.fromArray(g.shadows ?? [0, 0, 0]); lightTint.value.fromArray(g.lights ?? [0, 0, 0]);
    const b = source.userData.bloom ?? {};
    glow.strength.value = b.strength ?? .36; glow.radius.value = b.radius ?? .55; glow.threshold.value = b.threshold ?? .9;
    usePost = options.bloom !== false;
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
    const toneMapping = renderer.toneMapping, output = renderer.outputColorSpace;
    try { if (usePost) post.render(); else renderer.render(mirror.scene, mirror.camera); renderFrames++; mirror.afterRender(); }
    finally { renderer.toneMapping = toneMapping; renderer.outputColorSpace = output; }
  }
  return {
    async firstFrame(source, camera, options) {
      sync(source, camera, options); device.pushErrorScope("validation");
      // r169 compileAsync initializes shadow sampler bindings before the new
      // shadow render target has sized its DepthTexture. A normal first draw
      // runs shadow updateBefore in the right order and compiles the same real
      // pipelines. Validate that complete hidden frame before revealing it.
      try { draw(); await device.queue.onSubmittedWorkDone(); }
      finally {
        const error = await device.popErrorScope();
        if (error) throw new Error(`WebGPU first-frame validation: ${error.message}`);
      }
      prepared = true;
    },
    render(source, camera, options) { if (disposed || !prepared) throw new Error("WebGPU presentation is not ready"); sync(source, camera, options); draw(); },
    resize(w, h, r) { if (width === w && height === h && ratio === r) return; width = w; height = h; ratio = r; renderer.setPixelRatio(r); renderer.setSize(w, h, false); scenePass.setPixelRatio(r); scenePass.setSize(w, h); },
    stats() { return { actualBackend: "webgpu", renderFrames, ...mirror.stats(), materials: materials.stats, calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, textures: renderer.info.memory.textures, bufferWidth: canvas.width, bufferHeight: canvas.height, post: { hdr: usePost, bloom: usePost, displayGrade: usePost, fxaa: usePost && useAntialias, glowScale, toneMapping: "ACES", output: "sRGB" } }; },
    dispose,
  };
  } catch (error) { dispose(); throw error; }
}
