// Shared, DOM-free dimensions for wall art. Coordinates are room units: x is
// distance along a wall, y is height above the floor, both at the lower edge.
export const WALL_HEIGHT = 5.2;
export const WALL_MARGIN = 0.05;

export function wallRectanglesOverlap(a, b) {
  const e = 1e-6;
  return a.x < b.x + b.w - e && b.x < a.x + a.w - e && a.y < b.y + b.h - e && b.y < a.y + a.h - e;
}

export function wallBounds(length, width, height) {
  return { x0: WALL_MARGIN, x1: length - width - WALL_MARGIN, y0: WALL_MARGIN, y1: WALL_HEIGHT - height - WALL_MARGIN, z0: 0, z1: 0 };
}
