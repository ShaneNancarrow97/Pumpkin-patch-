// Capability-selected village presentation. Simulation, input and the DOM HUD
// retain their existing owners. A second canvas is necessary: a canvas which
// already owns WebGL cannot subsequently acquire a WebGPU context.
export function villageRendererPreference(search = "") {
  const value = new URLSearchParams(search).get("villageRenderer");
  return value === "webgl" ? "webgl" : "auto";
}

export function createVillageRenderer({ canvas, load = () => import("./village-webgpu-pipeline.js"), gpu = globalThis.navigator?.gpu, preference = villageRendererPreference(globalThis.location?.search), onFallback } = {}) {
  let pipeline = null, overlay = null, pending = null, active = false, retired = false, revealAfter = null;
  let width = 1, height = 1, pixelRatio = 1, failure = null, failureStack = null, stage = "idle", frames = 0, generation = 0;
  let rect = null;
  const status = () => ({ requested: preference, backend: active ? "webgpu" : "webgl", stage, reason: failure, failureStack, frames, ...(pipeline?.stats?.() ?? {}) });
  const conceal = () => { active = false; revealAfter = null; if (overlay) overlay.hidden = true; };
  function fail(error) {
    if (retired) return;
    conceal(); stage = "fallback"; failure = String(error?.message ?? error ?? "WebGPU unavailable");
    failureStack = error?.stack?.slice(0, 3000) ?? null;
    // Dispose only owned presentation resources. The source scene, geometry,
    // textures and original WebGL renderer continue to serve the game.
    pipeline?.dispose(); pipeline = null;
    onFallback?.(failure);
  }
  async function prepare(scene, camera, options) {
    if (retired || pending || pipeline || stage === "fallback") return pending;
    if (preference === "webgl") { stage = "disabled"; return; }
    if (!gpu?.requestAdapter) { stage = "fallback"; failure = "WebGPU API unavailable"; return; }
    const token = ++generation; stage = "initializing";
    pending = (async () => {
      const adapter = await gpu.requestAdapter({ powerPreference: "high-performance" });
      if (!adapter) throw new Error("No compatible WebGPU adapter");
      if (retired || token !== generation) return;
      const module = await load();
      if (retired || token !== generation) return;
      overlay = document.createElement("canvas"); overlay.className = "village-webgpu-canvas";
      overlay.setAttribute("aria-hidden", "true"); overlay.hidden = true;
      rect ??= canvas.getBoundingClientRect();
      Object.assign(overlay.style, { position: "fixed", left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`, pointerEvents: "none" });
      canvas.insertAdjacentElement("afterend", overlay);
      const owned = await module.createVillageWebGpuPipeline({ canvas: overlay, onFailure: fail });
      if (retired || token !== generation) { owned.dispose(); return; }
      pipeline = owned; pipeline.resize(width, height, pixelRatio);
      await pipeline.firstFrame(scene, camera, options);
      if (retired || token !== generation || !pipeline) return;
      stage = "ready";
      // The next existing game draw reveals this canvas with a current pose;
      // a completed background compilation must never flash a stale scene.
    })().catch(fail).finally(() => { pending = null; });
    return pending;
  }
  return {
    prepare,
    resize(w, h, ratio = 1) {
      width = Math.max(1, w); height = Math.max(1, h); pixelRatio = Math.max(.25, ratio);
      rect = canvas.getBoundingClientRect();
      if (overlay) Object.assign(overlay.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
      pipeline?.resize(width, height, pixelRatio);
    },
    draw(scene, camera, options = {}) {
      if (retired || stage === "fallback" || stage === "disabled") return false;
      if (!pipeline || stage !== "ready") { prepare(scene, camera, options); return false; }
      try {
        const revealIfComplete = () => {
          if (active || revealAfter === null) return;
          const stats = pipeline.stats?.() ?? {};
          if (stats.completedFrames === undefined || stats.completedFrames >= revealAfter) { active = true; revealAfter = null; overlay.hidden = false; }
        };
        revealIfComplete();
        const submitted = pipeline.render(scene, camera, options);
        if (submitted !== false) {
          frames++;
          if (!active && revealAfter === null) revealAfter = pipeline.stats?.().renderFrames ?? frames;
          revealIfComplete();
        }
        return active;
      } catch (error) { fail(error); return false; }
    },
    hide() { conceal(); pipeline?.invalidateShadows?.(); },
    get status() { return status(); },
    dispose() { retired = true; generation++; conceal(); pipeline?.dispose(); pipeline = null; overlay?.remove(); overlay = null; stage = "disposed"; },
  };
}
