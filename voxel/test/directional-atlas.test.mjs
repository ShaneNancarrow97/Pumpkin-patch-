import test from 'node:test';
import assert from 'node:assert/strict';
import { DIRECTION_DEGREES, DIRECTIONAL_ACTIONS, LOCOMOTION_PHASES, PUSH_PHASES, directionalBin, directionFromView, createDirectionalManifest, validateDirectionalManifest, directionalCoverage, selectDirectionalFrame, directionalAtlasBudget } from '../src/content/directional-atlas.js';

function fixture(action = 'walk', degree = 0, mobility = 'walking') {
  const m = createDirectionalManifest({ look: 'natalie-base', owner: 'natalie', mobility, sourceSeed: 'approved/natalie-front.png' });
  m.pages.push({ id: 'a', url: 'assets/cast/natalie-base/walk-000.webp', width: 2048, height: 320 });
  m.clips.push({ action, degree, authoring: 'drawn', review: { approved: true, preview: 'review/natalie-walk.gif' }, frames: Array.from({ length: DIRECTIONAL_ACTIONS[action].frames }, (_, i) => ({ page: 'a', rect: { x: i * 256, y: 0, w: 256, h: 320 }, anchor: { x: 128, y: 310 }, pixelsPerUnit: m.pixelsPerUnit, fingerprint: `${action}-${degree}-pixels-${i}`, phase: (mobility === 'wheelchair' ? PUSH_PHASES : LOCOMOTION_PHASES)[i] })) });
  return m;
}

test('24 camera-relative bins wrap across north without inventing a view for NaN', () => {
  assert.equal(DIRECTION_DEGREES.length, 24); assert.deepEqual(DIRECTION_DEGREES.slice(-2), [330, 345]);
  for (const [angle, expected] of [[0, 0], [360, 0], [-15, 345], [7.49, 0], [7.5, 15], [359, 0], [735, 15]]) assert.equal(directionalBin(angle), expected);
  assert.equal(directionalBin(NaN), null); assert.equal(directionalBin(Infinity), null);
});

test('an empty production manifest honestly reports every action and angle missing', () => {
  const m = createDirectionalManifest({ look: 'shane-base', owner: 'shane', sourceSeed: 'approved/shane.png' });
  assert.equal(validateDirectionalManifest(m).ok, true);
  const c = directionalCoverage(m); assert.equal(c.complete, false); assert.equal(c.expectedClips, 312); assert.equal(c.expectedFrames, 1920); assert.equal(c.authoredFrames, 0); assert.equal(c.missing.length, 312);
  assert.equal(selectDirectionalFrame(m).coverage, 'missing');
});

test('approved eight-phase art selects both contact legs and a once-only action endpoint', () => {
  const m = fixture(); assert.deepEqual(validateDirectionalManifest(m).warnings, []);
  assert.equal(selectDirectionalFrame(m, { action: 'walk', yaw: 0, progress: 0 }).frame.phase, 'contact-left');
  assert.equal(selectDirectionalFrame(m, { action: 'walk', yaw: 0, progress: .5 }).frame.phase, 'contact-right');
  assert.equal(selectDirectionalFrame(m, { action: 'walk', yaw: 360, progress: 1 }).index, 0);
  const p = fixture('plant'); assert.equal(selectDirectionalFrame(p, { action: 'plant', progress: 1 }).index, 5);
  assert.equal(directionalCoverage(m, ['walk']).authoredFrames, 8);
});

test('a nearest view is an explicit opt-in fallback and cannot fill coverage or change action', () => {
  const m = fixture(); assert.equal(selectDirectionalFrame(m, { action: 'walk', yaw: 15 }).frame, null);
  const f = selectDirectionalFrame(m, { action: 'walk', yaw: 15, allowNearest: true });
  assert.equal(f.coverage, 'fallback'); assert.equal(f.direction, 0); assert.equal(f.requestedDegree, 15);
  assert.equal(selectDirectionalFrame(m, { action: 'water', allowNearest: true }).coverage, 'missing');
  const c = directionalCoverage(m, ['walk']); assert.equal(c.authoredClips, 1); assert.equal(c.missing.length, 23);
});

test('repeated frames, copied angle sequences and mirrored art cannot claim new coverage', () => {
  const repeated = fixture(); repeated.clips[0].frames[4].fingerprint = repeated.clips[0].frames[0].fingerprint;
  assert.equal(directionalCoverage(repeated, ['walk']).authoredFrames, 0);
  const copy = fixture(); copy.clips.push({ ...structuredClone(copy.clips[0]), degree: 15 });
  assert.equal(directionalCoverage(copy, ['walk']).authoredClips, 1); assert.equal(selectDirectionalFrame(copy, { action: 'walk', yaw: 15 }).coverage, 'missing');
  for (const authoring of ['mirrored', 'plane-rotation', 'held-duplicate']) { const m = fixture(); m.clips[0].authoring = authoring; assert.equal(directionalCoverage(m).authoredFrames, 0); }
});

test('missing review, clipped frames, drifting scale and impossible anchors block a clip', () => {
  for (const alter of [m => { m.clips[0].review.approved = false; }, m => { m.clips[0].frames[7].rect.x = 2040; }, m => { m.clips[0].frames[2].pixelsPerUnit *= 1.1; }, m => { m.clips[0].frames[3].anchor.y = 500; }]) {
    const m = fixture(); alter(m); assert.equal(directionalCoverage(m, ['walk']).authoredClips, 0); assert.ok(validateDirectionalManifest(m).warnings.length);
  }
});

test('wheelchair locomotion requires arm/rim-push phases instead of walking leg claims', () => {
  const m = fixture('walk', 0, 'wheelchair'); assert.equal(directionalCoverage(m, ['walk']).authoredFrames, 8);
  assert.equal(selectDirectionalFrame(m, { action: 'walk', progress: .25 }).frame.phase, 'push-start');
  m.clips[0].frames[0].phase = 'contact-left'; assert.equal(directionalCoverage(m, ['walk']).authoredFrames, 0);
});

test('malformed or duplicated manifests cannot choose ambiguous runtime art', () => {
  assert.equal(validateDirectionalManifest(null).ok, false); assert.equal(selectDirectionalFrame(null).frame, null);
  const m = fixture(); m.clips.push(structuredClone(m.clips[0])); assert.equal(validateDirectionalManifest(m).ok, false); assert.equal(selectDirectionalFrame(m, { action: 'walk' }).frame, null);
  const n = fixture(); n.pages.push({ ...n.pages[0] }); assert.equal(validateDirectionalManifest(n).ok, false);
});

test('memory budgets distinguish decoded textures, mipmaps, measured encoding and HTML expansion', () => {
  const b = directionalAtlasBudget(); assert.equal(b.frames, 3840); assert.equal(b.rgbaBytes, 1258291200); assert.equal(b.rgbaMipBytes, 1677721600); assert.equal(b.encodedBytes, null);
  const one = directionalAtlasBudget({ looks: 1, directions: 4, encodedBytesPerFrame: 5000 }); assert.equal(one.rgbaBytes, 10485760); assert.equal(one.encodedBytes, 160000); assert.equal(one.base64Bytes, 213336);
  assert.throws(() => directionalAtlasBudget({ width: -1 }), RangeError);
});

test('single authored neutral poses are usable without claiming a complete breathing animation', () => {
  const m=fixture('idle',90);m.clips[0].mode='pose';m.clips[0].frames=m.clips[0].frames.slice(0,1);
  const f=selectDirectionalFrame(m,{action:'idle',yaw:90,progress:.8});assert.ok(f.frame);assert.equal(f.mode,'pose');assert.equal(f.direction,90);
  const c=directionalCoverage(m,['idle']);assert.equal(c.authoredPoses,1);assert.equal(c.authoredClips,0);assert.equal(c.authoredFrames,1);assert.equal(c.complete,false);
  for(const [x,z,want]of [[0,-1,0],[1,0,90],[0,1,180],[-1,0,270]])assert.equal(directionFromView(x,z),want);
  assert.equal(directionFromView(0,0),null);
});
