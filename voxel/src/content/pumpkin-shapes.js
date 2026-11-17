// Pumpkin shapes, for the carving bench and the patch (pumpkins.js,
// carving-pumpkin.js). Each changes a variety's own form: how tall it is, how
// many lobes it has, how deep the grooves between them run, how square its
// shoulders are (squash), the dip round the stem, and warts. "Ribbed" is the
// variety as it grows.
export const PUMPKIN_SHAPES = Object.freeze([
  { id: "ribbed", name: "Ribbed", form: {} },
  { id: "round", name: "Round", form: { tall: .84, lobes: 12, groove: .028, crease: .05, squash: 2, dimple: .2 } },
  { id: "tall", name: "Tall", form: { tall: 1.04, lobes: 10, groove: .07, crease: .1, squash: 2.15 } },
  { id: "squat", name: "Squat", form: { tall: .5, lobes: 12, groove: .2, crease: .26, squash: 3.1, dimple: .4 } },
  { id: "warty", name: "Warty", form: { tall: .78, groove: .08, crease: .12, squash: 2.2, warts: .085 } },
].map((s) => Object.freeze({ ...s, form: Object.freeze(s.form) })));
export const PUMPKIN_SHAPE_BY_ID = Object.freeze(Object.fromEntries(PUMPKIN_SHAPES.map((s) => [s.id, s])));
export const shapeOk = (id) => Object.hasOwn(PUMPKIN_SHAPE_BY_ID, id);
// The patch's plots each grow one shape, mostly ribbed, so the field looks natural.
const PLOT_SHAPES = ["ribbed", "ribbed", "round", "tall", "ribbed", "squat", "round", "warty"];
export const plotShape = (i) => PLOT_SHAPES[(i * 5 + 2) % PLOT_SHAPES.length];
