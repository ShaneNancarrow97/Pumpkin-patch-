// Normalise a complete four-frame row with one shared body scale. Each frame's
// feet and silhouette centre map to the same world anchor despite atlas gutters.
export const SPECIAL_SPRITE_ROWS = [
  { id: "axel", height: 1.65 },
  { id: "baron", height: 1.9 },
];
export function specialSpriteMetadata(width, height, rgba) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 4 || height < 2 || !rgba || rgba.length < width * height * 4) throw Error("Invalid special character atlas");
  const result = { w: width, h: height, rows: {} };
  for (let row = 0; row < SPECIAL_SPRITE_ROWS.length; row++) {
    const spec = SPECIAL_SPRITE_ROWS[row], y = Math.round(row * height / 2), endY = Math.round((row + 1) * height / 2), frames = [];
    let bodyHeight = 0;
    for (let col = 0; col < 4; col++) {
      const x = Math.round(col * width / 4), w = Math.round((col + 1) * width / 4) - x, h = endY - y;
      let left = w, right = -1, top = h, bottom = -1;
      for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) if (rgba[((y + yy) * width + x + xx) * 4 + 3] > 32) {
        left = Math.min(left, xx); right = Math.max(right, xx); top = Math.min(top, yy); bottom = Math.max(bottom, yy);
      }
      if (bottom < top) throw Error(`Missing ${spec.id} animation frame ${col + 1}`);
      bodyHeight = Math.max(bodyHeight, bottom - top + 1);
      frames.push({ x, y, w, h, ax: (left + right + 1) / 2, ay: bottom + 1, bounds: { left, right, top, bottom } });
    }
    const unit = spec.height / bodyHeight;
    result.rows[spec.id] = { unit, height: spec.height, frames: frames.map(f => ({ ...f, unit })) };
  }
  return result;
}
