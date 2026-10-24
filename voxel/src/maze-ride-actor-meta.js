// Each column is one original character; the second row is its reveal pose.
export const MAZE_SCARE_ACTORS = [
  { id: "ghoul", height: 2.3 },
  { id: "clown", height: 2.25 },
  { id: "scarecrow", height: 2.45 },
  { id: "wraith", height: 2.55 },
];
export const MAZE_HAUNTED_GIRL = { id: "haunted-girl", height: 2.3 };
export const MAZE_RIDE_ACTORS = [...MAZE_SCARE_ACTORS, MAZE_HAUNTED_GIRL];
export const MAZE_SCARE_POSES = ["lurking", "scare"];

// Sample the central torso rather than outstretched hands when centring art.
function torsoCentre(frame, width, rgba) {
  const { bounds: b } = frame, rows = [], body = b.bottom - b.top + 1;
  const top = Math.ceil(b.top + body * .4), bottom = Math.floor(b.top + body * .72);
  const left = Math.floor(frame.w * .25), right = Math.ceil(frame.w * .75);
  for (let y = top; y <= bottom; y++) {
    let total = 0, count = 0;
    for (let x = left; x < right; x++) if (rgba[((frame.y + y) * width + frame.x + x) * 4 + 3] > 32) { total += x + .5; count++; }
    if (count) rows.push(total / count);
  }
  rows.sort((a, b) => a - b);
  return rows.length ? rows[Math.floor(rows.length / 2)] : frame.w / 2;
}

// Round cell edges independently so odd-sized generated PNGs lose no pixels.
// Both poses keep one body scale and a stable torso anchor; their own alpha
// feet stay on the floor even when the reveal raises a hand above the head.
function actorAtlasMetadata(width, height, rgba, specs, columns, rows, cellForPose, alignTorso = false) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < columns || height < rows || !rgba || rgba.length < width * height * 4) throw Error("Invalid maze scare actor atlas");
  const result = { w: width, h: height, columns, rows, actors: {} };
  for (let actor = 0; actor < specs.length; actor++) {
    const spec = specs[actor], frames = [];
    let bodyPixels = 0;
    for (let pose = 0; pose < MAZE_SCARE_POSES.length; pose++) {
      const [col, row] = cellForPose(actor, pose);
      const x = Math.round(col * width / columns), y = Math.round(row * height / rows);
      const w = Math.round((col + 1) * width / columns) - x, h = Math.round((row + 1) * height / rows) - y;
      let left = w, right = -1, top = h, bottom = -1;
      for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) if (rgba[((y + yy) * width + x + xx) * 4 + 3] > 32) {
        left = Math.min(left, xx); right = Math.max(right, xx); top = Math.min(top, yy); bottom = Math.max(bottom, yy);
      }
      if (bottom < top) throw Error(`Missing ${spec.id} ${MAZE_SCARE_POSES[pose]} pose`);
      bodyPixels = Math.max(bodyPixels, bottom - top + 1);
      frames.push({ x, y, w, h, pose: MAZE_SCARE_POSES[pose], ay: bottom + 1, bounds: { left, right, top, bottom } });
    }
    const unit = spec.height / bodyPixels;
    for (const frame of frames) frame.torsoX = torsoCentre(frame, width, rgba);
    const anchorX = frames.reduce((sum, frame) => sum + frame.torsoX, 0) / frames.length;
    for (const frame of frames) { frame.ax = alignTorso ? frame.torsoX : anchorX; frame.unit = unit; }
    result.actors[spec.id] = { id: spec.id, height: spec.height, bodyPixels, unit, anchorX, anchorMode: alignTorso ? "torso" : "shared", frames, poses: Object.fromEntries(frames.map(frame => [frame.pose, frame])) };
  }
  return result;
}

// The original four share a 4 by 2 sheet, one character in each column.
export function mazeScareActorMetadata(width, height, rgba) {
  return actorAtlasMetadata(width, height, rgba, MAZE_SCARE_ACTORS, 4, 2, (actor, pose) => [actor, pose]);
}

// Her source poses sit at different cell centres, so align their torsos to the
// same world centre while retaining their shared pixel scale and alpha feet.
export function mazeHauntedGirlMetadata(width, height, rgba) {
  return actorAtlasMetadata(width, height, rgba, [MAZE_HAUNTED_GIRL], 2, 1, (_actor, pose) => [pose, 0], true);
}
