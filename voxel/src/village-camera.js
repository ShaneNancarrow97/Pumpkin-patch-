// The village's outdoor play camera, as numbers the view and its tests share. Presentation only: none of it is saved.
const rad = (deg) => deg * Math.PI / 180;
const smooth = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

// pitch is the arm's rise behind the owner; the lens itself looks a little above their head (lift), so they
// stand in the lower half of the picture with the street, the roofs and the sky above them.
//   nearest  the shortest the arm gets when a wall is behind the owner (world units)
//   tuck     how far the lens rises as the arm shortens, to keep looking over the owner's shoulder
export const OUTSIDE_VIEW = Object.freeze({ pitch: rad(12), minPitch: rad(-14), maxPitch: rad(62), distance: 7.6, lift: 1.05, nearest: 2.4, tuck: 1.5 });

// Looking down from above there is nothing to see over the owner's head, so the lift eases away.
export function outsideLookLift(pitch) { return OUTSIDE_VIEW.lift * (1 - smooth(rad(24), rad(52), pitch)); }
