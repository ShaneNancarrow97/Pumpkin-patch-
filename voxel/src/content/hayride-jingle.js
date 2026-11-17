// The music box in the Hollow Man's breakdown (hayride-stall.js): an
// original waltz that winds down as it plays. Each note is { t: seconds into
// the tune, note: MIDI number, slow: 0 to 1, how far it has run down }.
// ui/hayride-audio.js plays it; his face flares with each note. The tune
// stops dead at JINGLE_LENGTH.
const TUNE = [74, 77, 81, 80, 77, 74, 73, 76, 79, 77, 76, 74, 69, 74, 77, 76, 73, 69, 70, 69, 68, 62];
export const JINGLE_LENGTH = 10;
export const JINGLE = Object.freeze((() => {
  let t = 0;
  return TUNE.map((note, i) => { const at = t; t += .36 + Math.max(0, i - 11) * .045; return Object.freeze({ t: +at.toFixed(3), note, slow: Math.max(0, i - 11) / 10 }); });
})());
