// Whether the new-game introduction plays. It is for new patches only: a save
// that has already been played counts as having seen it, which also covers
// saves from before the introduction existed, since they carry no flag at all.

// Any sign the patch has been played: something planted, picked, sold, tapped
// or earned, or a favour or memory to its name.
export const hasPlayed = (s) =>
  s.harvested > 0 || s.sold > 0 || s.taps > 0 || s.earned > 0 || s.claimed.length > 0 || s.memories.length > 0 ||
  s.plots.some((p) => p.phase !== "empty");

// Restoring a save: keep a saved flag, or mark it seen if the patch is already under way.
export const restoreIntroSeen = (raw, s) => raw?.introSeen === true || hasPlayed(s);

export const shouldShowIntro = (s) => s.introSeen !== true && !hasPlayed(s);
