// Capability-selected village presentation. Simulation, input and the DOM HUD
// retain their existing owners. A second canvas is necessary: a canvas which
// already owns WebGL cannot subsequently acquire a WebGPU context.
const validPreference = value => value === "webgl" || value === "webgpu" ? value : "auto";
export function villageRendererPreference(search = "") {
  return validPreference(new URLSearchParams(search).get("villageRenderer"));
}

export function createVillageRenderer({ canvas, load = () => import("./village-webgpu-pipeline.js"), gpu = globalThis.navigator?.gpu, preference = villageRendererPreference(globalThis.location?.search), onFallback } = {}) {
  preference = validPreference(preference);
  let pipeline = null, overlay = null, pending = null, owner = null, active = false, retired = false, revealAfter = null;
  let width = 1, height = 1, pixelRatio = 1, failure = null, failureStack = null, stage = "idle", frames = 0, generation = 0;
  let rect = null;
  const status = () => ({ requested: preference, backend: active ? "webgpu" : "webgl", stage, reason: failure, failureStack, frames, ...(pipeline?.stats?.() ?? {}) });
  const conceal = () => { active = false; revealAfter = null; if (overlay) overlay.hidden = true; };
  const current = entry => !!entry && !retired && entry === owner && entry.token === generation && preference !== "webgl";
  function release(entry) {
    if (!entry) return;
    // A late factory result belongs to its original attempt, never a newer one.
    const owned = entry.pipeline, node = entry.overlay;
    entry.pipeline = entry.overlay = null;
    if (pipeline === owned) pipeline = null;
    if (overlay === node) overlay = null;
    try { owned?.dispose(); } catch { /* a lost device must not block returning to WebGL */ }
    finally { node?.remove(); }
  }
  function fail(error, entry) {
    if (!current(entry)) { release(entry); return; }
    conceal(); stage = "fallback"; failure = String(error?.message ?? error ?? "WebGPU unavailable");
    failureStack = error?.stack?.slice(0, 3000) ?? null;
    owner = null; generation++;
    // Dispose only owned presentation resources; WebGL remains playable.
    release(entry); onFallback?.(failure);
  }
  function prepare(scene, camera, options) {
    if (retired || pending || pipeline || stage === "fallback") return pending;
    if (preference === "webgl") { stage = "disabled"; return; }
    if (!gpu?.requestAdapter) { stage = "fallback"; failure = "WebGPU API unavailable"; return; }
    const entry = { token: ++generation, pipeline: null, overlay: null }; owner = entry; stage = "initializing";
    const job = (async () => {
      const adapter = await gpu.requestAdapter({ powerPreference: "high-performance" });
      if (!current(entry)) return;
      if (!adapter) throw new Error("No compatible WebGPU adapter");
      const module = await load();
      if (!current(entry)) return;
      const node = document.createElement("canvas"); entry.overlay = overlay = node;
      node.className = "village-webgpu-canvas"; node.setAttribute("aria-hidden", "true"); node.hidden = true;
      rect ??= canvas.getBoundingClientRect();
      Object.assign(node.style, { position: "fixed", left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`, pointerEvents: "none" });
      canvas.insertAdjacentElement("afterend", node);
      entry.pipeline = await module.createVillageWebGpuPipeline({ canvas: node, onFailure: error => fail(error, entry) });
      if (!current(entry)) { release(entry); return; }
      pipeline = entry.pipeline; pipeline.resize(width, height, pixelRatio);
      await pipeline.firstFrame(scene, camera, options);
      if (!current(entry) || !pipeline) return;
      stage = "ready";
      // Reveal only after the next current game picture has completed.
    })().catch(error => fail(error, entry)).finally(() => {
      if (!current(entry)) release(entry);
      if (pending === job) pending = null;
    });
    pending = job; return job;
  }
  return {
    prepare,
    setPreference(value) {
      const next = validPreference(value);
      if (retired || next === preference) return preference;
      preference = next;
      // Auto and explicit WebGPU share a healthy device and any current warmup.
      if (next !== "webgl" && owner && (pipeline || pending) && stage !== "fallback") return preference;
      const old = owner, hadPresentation = !!overlay;
      generation++; conceal(); owner = null; release(old);
      failure = failureStack = null; stage = next === "webgl" ? "disabled" : "idle";
      if (hadPresentation) onFallback?.(null);
      // A cancelled factory drains before another starts. Three r169's post
      // material is shared, so a late old disposal must not reset a new graph.
      return preference;
    },
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
      } catch (error) { fail(error, owner); return false; }
    },
    hide() { conceal(); pipeline?.invalidateShadows?.(); },
    get status() { return status(); },
    dispose() { if (retired) return; retired = true; generation++; conceal(); const old = owner; owner = null; release(old); stage = "disposed"; },
  };
}
