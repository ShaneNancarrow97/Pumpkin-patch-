import { PLAN_SCALE as K } from "./village.js";

// The grand tour (realm coordinates, drawn up on the design grid and scaled into the world):
// the camera's place [x, height, z], where it looks, and the title that rises there.
export const TOUR = Object.freeze([
  { at: [58, 30, -16], look: [58, 2, 22], title: "Mothlight Village", sub: "Over the hill from your farm" },
  { at: [58, 10, 4], look: [57, 1, 24], title: "Hollow Green", sub: "The square, the well and the noticeboard" },
  { at: [49, 8, 14], look: [40, 2, 22], title: "Elowen's library", sub: "A conservatory, one day" },
  { at: [62, 7, 13], look: [72, 1.5, 19], title: "Rowan's workshop", sub: "More plans than walls" },
  { at: [100, 16, 46], look: [102, 5, 21], title: "The Velvet Bat", sub: "A tavern for bats and night folk · Vesper keeps the door" },
  { at: [120, 22, 22], look: [144, 5, 52], title: "Carnival Moor", sub: "Corvus's tents and the Baron's manor · level 12" },
  { at: [104, 26, 96], look: [84, 0, 122], title: "Mirror Marsh", sub: "Where the observatory waits · level 15" },
  { at: [62, 22, 52], look: [62, 8, 80], title: "Lantern Quarry", sub: "Beyond the broken bridge · opens at level 9" },
  { at: [16, 22, 48], look: [-12, 4, 82], title: "Moonroot Copse", sub: "Mabel and Tansy, behind the brambles · level 6" },
  { at: [60, 70, -10], look: [82, 18, 170], title: "…and beyond", sub: "" },
  { at: [57, 6.5, 13], look: [56, 1.2, 24], title: "Welcome to Mothlight", sub: "" },
].map((p) => Object.freeze({ ...p, at: p.at.map((v) => v * K), look: p.look.map((v) => v * K) })));

// The same visible words identify the packaged narration.
export const tourVoiceText = stop => [stop.title, stop.sub].filter(Boolean).join(". ");
