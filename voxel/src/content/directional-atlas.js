// Asset contracts only: no renderer, saved state or claim that art already exists.
export const DIRECTION_DEGREES = Object.freeze(Array.from({ length: 24 }, (_, i) => i * 15));
export const LOCOMOTION_PHASES = Object.freeze(['contact-left', 'down-left', 'passing-left', 'up-left', 'contact-right', 'down-right', 'passing-right', 'up-right']);
export const PUSH_PHASES = Object.freeze(['reach', 'grip', 'push-start', 'push', 'release', 'recover-low', 'recover-high', 'reach-return']);
export const DIRECTIONAL_ACTIONS = Object.freeze(Object.fromEntries([
  ['idle', 4, true], ['walk', 8, true], ['jog', 8, true],
  ['plant', 6, false], ['water', 6, true], ['harvest', 6, false],
  ['clean', 6, true], ['interact', 6, false], ['sit', 4, true],
  ['read', 4, true], ['pet', 6, true], ['cook', 8, true], ['carve', 8, true],
].map(([id, frames, loop]) => [id, Object.freeze({ frames, loop })])));
const authored = new Set(['drawn', 'rig-rendered']);
const finite = Number.isFinite;
const positive = n => finite(n) && n > 0;
const validDegree = n => DIRECTION_DEGREES.includes(n);
const modulo = (n, size) => ((n % size) + size) % size;

// Zero faces the camera, 90 faces screen-right, 180 faces away, 270 screen-left.
// Runtime callers convert world heading to camera-relative yaw before this step.
export function directionalBin(degrees) {
  return finite(degrees) ? modulo(Math.round(degrees / 15) * 15, 360) : null;
}

export function directionFromView(screenRight, awayFromCamera) {
  return [screenRight, awayFromCamera].every(finite) && Math.hypot(screenRight, awayFromCamera) > 1e-8 ? directionalBin(Math.atan2(screenRight, -awayFromCamera) * 180 / Math.PI) : null;
}

export function createDirectionalManifest({ look, owner, mobility = 'walking', sourceSeed = null, pixelsPerUnit = 320 / 2.3 } = {}) {
  return { version: 1, look, owner, mobility, sourceSeed, pixelsPerUnit, pages: [], clips: [] };
}

function duplicateSequences(clips) {
  const seen = new Set(), duplicates = new Set();
  for (const c of Array.isArray(clips) ? clips : []) {
    if (!Array.isArray(c?.frames) || !c.frames.length || !c.frames.every(f => typeof f?.fingerprint === 'string' && f.fingerprint)) continue;
    const key = c.frames.map(f => f.fingerprint).join('|');
    if (seen.has(key)) duplicates.add(c); else seen.add(key);
  }
  return duplicates;
}

function clipErrors(manifest, clip, pages) {
  const errors = [], spec = DIRECTIONAL_ACTIONS[clip?.action];
  if (!spec || !validDegree(clip?.degree)) return ['unknown action or noncanonical direction'];
  if (!authored.has(clip.authoring)) errors.push('derived art does not establish authored coverage');
  if (clip.review?.approved !== true || typeof clip.review?.preview !== 'string' || !clip.review.preview) errors.push('visual review is missing');
  const pose = clip.mode === 'pose';
  if (pose && clip.action !== 'idle') errors.push('single-frame pose mode is reserved for neutral idle');
  const expected = pose ? 1 : spec.frames;
  if (!Array.isArray(clip.frames) || clip.frames.length !== expected) errors.push(`expected ${expected} frames`);
  const fingerprints = new Set(), locomotion = ['walk', 'jog'].includes(clip.action);
  const phases = manifest.mobility === 'wheelchair' ? PUSH_PHASES : LOCOMOTION_PHASES;
  for (const [i, frame] of (Array.isArray(clip.frames) ? clip.frames : []).entries()) {
    const page = pages.get(frame?.page), r = frame?.rect, a = frame?.anchor;
    if (!page || !r || ![r.x, r.y, r.w, r.h].every(finite) || r.x < 0 || r.y < 0 || r.w <= 0 || r.h <= 0 || r.x + r.w > page.width || r.y + r.h > page.height) errors.push(`frame ${i}: atlas rectangle is outside its page`);
    if (!a || !r || ![a.x, a.y].every(finite) || a.x < 0 || a.y < 0 || a.x > r.w || a.y > r.h) errors.push(`frame ${i}: ground anchor is invalid`);
    if (!positive(frame?.pixelsPerUnit) || Math.abs(frame.pixelsPerUnit - manifest.pixelsPerUnit) > 1e-6) errors.push(`frame ${i}: physical scale differs from its character`);
    if (typeof frame?.fingerprint !== 'string' || !frame.fingerprint) errors.push(`frame ${i}: pixel fingerprint is missing`);
    else { if (fingerprints.has(frame.fingerprint)) errors.push(`frame ${i}: repeated pixels do not establish an animation phase`); fingerprints.add(frame.fingerprint); }
    if (locomotion && frame?.phase !== phases[i]) errors.push(`frame ${i}: locomotion phase is not ${phases[i]}`);
  }
  return errors;
}

// An explicit preview approval plus unique pixels is a gate, not a substitute
// for inspecting limb motion, likeness, occlusion and head/body proportions.
export function validateDirectionalManifest(manifest) {
  const errors = [], warnings = [], m = manifest ?? {}, pages = new Map();
  if (m.version !== 1) errors.push('unsupported manifest version');
  if (typeof m.look !== 'string' || !m.look) errors.push('look is missing');
  if (!['shane', 'natalie'].includes(m.owner)) errors.push('owner is invalid');
  if (!['walking', 'wheelchair'].includes(m.mobility)) errors.push('mobility is invalid');
  if (typeof m.sourceSeed !== 'string' || !m.sourceSeed) errors.push('approved source seed is missing');
  if (!positive(m.pixelsPerUnit)) errors.push('pixels per world unit is invalid');
  if (!Array.isArray(m.pages) || !Array.isArray(m.clips)) errors.push('pages and clips must be arrays');
  for (const p of Array.isArray(m.pages) ? m.pages : []) {
    if (!p || typeof p.id !== 'string' || !p.id || pages.has(p.id) || typeof p.url !== 'string' || !p.url || !positive(p.width) || !positive(p.height) || !Number.isInteger(p.width) || !Number.isInteger(p.height)) errors.push('atlas page is invalid or duplicated');
    else pages.set(p.id, p);
  }
  const seen = new Set(), repeated = duplicateSequences(m.clips);
  for (const c of Array.isArray(m.clips) ? m.clips : []) {
    const key = c?.action + ':' + c?.degree;
    if (seen.has(key)) errors.push(`duplicate clip ${key}`); seen.add(key);
    if (repeated.has(c)) warnings.push(`${key}: copied sequence does not establish another direction or action`);
    for (const error of clipErrors(m, c, pages)) warnings.push(`${key}: ${error}`);
  }
  return { ok: errors.length === 0, errors, warnings };
}

function approvedClips(manifest) {
  if (!validateDirectionalManifest(manifest).ok) return [];
  const pages = new Map(manifest.pages.map(p => [p.id, p])), duplicate = new Set(), seen = new Set();
  for (const c of manifest.clips) { const key = c?.action + ':' + c?.degree; if (seen.has(key)) duplicate.add(key); seen.add(key); }
  const repeated = duplicateSequences(manifest.clips);
  return manifest.clips.filter(c => !repeated.has(c) && !duplicate.has(c?.action + ':' + c?.degree) && clipErrors(manifest, c, pages).length === 0);
}

export function directionalCoverage(manifest, actions = Object.keys(DIRECTIONAL_ACTIONS)) {
  const required = [...new Set((Array.isArray(actions) ? actions : []).filter(a => DIRECTIONAL_ACTIONS[a]))], accepted = approvedClips(manifest), animated = accepted.filter(c => c.mode !== 'pose'), keys = new Set(animated.map(c => c.action + ':' + c.degree));
  const missing = [];
  for (const action of required) for (const degree of DIRECTION_DEGREES) if (!keys.has(action + ':' + degree)) missing.push({ action, degree });
  const completed = animated.filter(c => required.includes(c.action));
  const poses = accepted.filter(c => c.mode === 'pose' && required.includes(c.action));
  return { expectedClips: required.length * 24, expectedFrames: required.reduce((sum, a) => sum + DIRECTIONAL_ACTIONS[a].frames * 24, 0), authoredClips: completed.length, authoredPoses: poses.length, authoredFrames: completed.reduce((sum, c) => sum + c.frames.length, 0) + poses.length, complete: missing.length === 0, missing };
}

// Fallback never silently changes action/outfit and never counts as new art.
export function selectDirectionalFrame(manifest, { action = 'idle', yaw = 0, progress = 0, allowNearest = false } = {}) {
  const requestedDegree = directionalBin(yaw), spec = DIRECTIONAL_ACTIONS[action];
  const absent = { frame: null, coverage: 'missing', requestedDegree, direction: null, action };
  if (requestedDegree === null || !spec) return absent;
  const clips = approvedClips(manifest).filter(c => c.action === action);
  let clip = clips.find(c => c.degree === requestedDegree);
  if (!clip && allowNearest) clip = clips.sort((a, b) => Math.abs(modulo(a.degree - requestedDegree + 180, 360) - 180) - Math.abs(modulo(b.degree - requestedDegree + 180, 360) - 180) || a.degree - b.degree)[0];
  if (!clip) return absent;
  const value = finite(progress) ? progress : 0;
  const phase = spec.loop ? modulo(value, 1) : Math.max(0, Math.min(1, value));
  const count = clip.frames.length, index = Math.min(count - 1, Math.floor(phase * count));
  return { frame: clip.frames[index], index, direction: clip.degree, requestedDegree, action, mode: clip.mode === 'pose' ? 'pose' : 'animation', coverage: clip.degree === requestedDegree ? 'authored' : 'fallback' };
}

// Compression is content-dependent; report GPU bytes separately from file bytes.
export function directionalAtlasBudget({ looks = 20, directions = 24, frames = 8, width = 256, height = 320, encodedBytesPerFrame = null } = {}) {
  if (![looks, directions, frames, width, height].every(n => positive(n) && Number.isInteger(n))) throw new RangeError('budget dimensions must be positive integers');
  const count = looks * directions * frames, rgbaBytes = count * width * height * 4;
  return { frames: count, rgbaBytes, rgbaMipBytes: Math.ceil(rgbaBytes * 4 / 3), encodedBytes: positive(encodedBytesPerFrame) ? Math.ceil(count * encodedBytesPerFrame) : null, base64Bytes: positive(encodedBytesPerFrame) ? Math.ceil(count * encodedBytesPerFrame / 3) * 4 : null };
}
