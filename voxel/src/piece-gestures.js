import * as THREE from "three";

// Drag a selected piece across the floor with one finger (or the mouse) and
// turn it with two, as in the house. The listeners run in the capture phase,
// so a gesture is claimed before the view's OrbitControls sees it; `busy`
// tells the view to keep its controls off until every finger lifts.
//   camera(): the view's camera; floorY(): the height pieces stand on
//   grabs(event, floorPoint, raycaster): whether the pointer is on the piece
//   begin(), drag(x, z), turn(degrees), end(cancelled): the editor's side
//   controls: switched off the moment a gesture is claimed
export function attachPieceGestures(canvas, { enabled, camera, controls, floorY = () => 0, grabs, begin, drag, turn, end }) {
  const touches = new Map(), ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3(), ndc = new THREE.Vector2();
  let mode = null, offset = null, angle = 0, start = null;
  const floor = e => {
    const box = canvas.getBoundingClientRect(); ndc.set((e.clientX - box.left) / box.width * 2 - 1, -(e.clientY - box.top) / box.height * 2 + 1);
    ray.setFromCamera(ndc, camera()); plane.constant = -floorY();
    return ray.ray.intersectPlane(plane, hit) ? { x: hit.x, z: hit.z } : null;
  };
  const twist = () => { const [a, b] = [...touches.values()]; return Math.atan2(a.y - b.y, a.x - b.x); };
  const finish = cancelled => { if (mode) end(cancelled); mode = null; offset = start = null; };
  canvas.addEventListener("pointerdown", e => {
    if (!enabled()) { touches.clear(); return; }
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.size === 1 && (e.pointerType !== "mouse" || e.button === 0)) {
      const at = floor(e), pose = at && grabs(e, at, ray);
      if (pose && begin()) { mode = "drag"; offset = { x: pose.x - at.x, z: pose.z - at.z }; start = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture?.(e.pointerId); if (controls) controls.enabled = false; }
    } else if (touches.size === 2) {
      // A second finger turns the piece; a drag in progress is kept.
      if (mode === "drag") end(false);
      mode = begin() ? "turn" : null; angle = twist(); if (controls) controls.enabled = false;
    }
  }, { capture: true });
  canvas.addEventListener("pointermove", e => {
    if (!touches.has(e.pointerId)) return;
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (mode === "drag" && Math.hypot(e.clientX - start.x, e.clientY - start.y) >= 4) { const at = floor(e); if (at) drag(at.x + offset.x, at.z + offset.z); }
    if (mode === "turn" && touches.size === 2) { const next = twist(), delta = Math.atan2(Math.sin(next - angle), Math.cos(next - angle)); angle = next; turn(-delta * 180 / Math.PI); }
  }, { capture: true });
  const lift = e => { if (!touches.delete(e.pointerId)) return; if (mode === "turn" && touches.size < 2 || mode === "drag") finish(e.type !== "pointerup"); };
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) canvas.addEventListener(type, lift, { capture: true });
  return { get busy() { return !!mode || touches.size > 1 && enabled(); }, get mode() { return mode; } };
}
