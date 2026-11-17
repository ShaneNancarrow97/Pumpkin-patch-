// A ray projected onto the three decorateable faces of an open-front room.
// Coordinates are room-local. Keeping the wall on every result lets a drag
// cross a corner without reusing the old wall's horizontal coordinate.
export function projectWallRay(ray, room, preferred = "back") {
  const { origin: o, direction: d } = ray, height = room.h ?? 5.2;
  const planes = [
    { wall: "back", axis: "z", at: 0, length: room.w },
    { wall: "left", axis: "x", at: 0, length: room.d },
    { wall: "right", axis: "x", at: room.w, length: room.d },
  ];
  const hits = [];
  for (const p of planes) {
    if (Math.abs(d[p.axis]) < 1e-8) continue;
    const t = (p.at - o[p.axis]) / d[p.axis];
    if (!Number.isFinite(t) || t < 0) continue;
    const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t;
    const u = p.wall === "back" ? x : z;
    hits.push({ wall: p.wall, x: u, y, z: 0, t, inside: u >= 0 && u <= p.length && y >= 0 && y <= height });
  }
  // Outside the room retain the active face, so the red preview shows why the
  // location is invalid instead of silently pinning the piece to an edge.
  const hit = hits.filter(p => p.inside).sort((a, b) => a.t - b.t)[0] ?? hits.find(p => p.wall === preferred);
  if (!hit) return null;
  return { x: hit.x, y: hit.y, z: 0, wall: hit.wall };
}
