var parlourScene = {
  id: "parlour",
  width: 1e3,
  height: 660,
  floor: { left: 80, right: 920, top: 405, bottom: 625 },
  wall: { left: 80, right: 920, top: 160, bottom: 395 }
};
var roomScenes = Object.fromEntries(["parlour", "bedroom", "kitchen", "attic"].map((id) => [id, { ...parlourScene, id }]));
function scenePercent(point) {
  return { x: point.x / parlourScene.width * 100, y: point.y / parlourScene.height * 100 };
}
function spriteSize(spec) {
  const width = (spec.width || 12) * parlourScene.width / 100;
  return { width, height: spec.rect ? width * spec.rect[3] / spec.rect[2] : 0 };
}
function constrainPlacement(spec, point, sceneId = "parlour") {
  const scene = roomScenes[sceneId] || parlourScene;
  const size = spriteSize(spec), surface = spec.wall ? scene.wall : scene.floor;
  const left = Math.max(surface.left, size.width / 2 + 12);
  const right = Math.min(surface.right, parlourScene.width - size.width / 2 - 12);
  const top = Math.max(surface.top, size.height * (spec.rug ? 0.45 : 1) + 12);
  return {
    x: Math.round(Math.min(right, Math.max(left, point.x))),
    y: Math.round(Math.min(surface.bottom, Math.max(top, point.y)))
  };
}
function cameraDelta(dx, dy, bounds) {
  return {
    x: bounds.width > 0 ? dx / bounds.width * parlourScene.width : 0,
    y: bounds.height > 0 ? dy / bounds.height * parlourScene.height : 0
  };
}
function attachmentPoint(anchor, size, local, flipped) {
  return {
    x: anchor.x + ((flipped ? 1 - local.x : local.x) - 0.5) * size.width,
    y: anchor.y - (1 - local.y) * size.height
  };
}

export { attachmentPoint, cameraDelta, constrainPlacement, scenePercent, spriteSize };
