// Order of the authored cut-outs in assets/hayride-upgrade-icons.webp.
// Every purchase keeps its text label; the art is a recognition aid only.
export const HAYRIDE_ICON_GRID = Object.freeze({ columns: 4, rows: 3, cell: 192 });
export const HAYRIDE_ICON_IDS = Object.freeze([
  'tier1', 'tier2', 'tier3', 'fleet',
  'dispatch', 'route1', 'route2', 'turning-scarecrows',
  'spider-drop', 'bride-procession', 'spectral-burst', 'bus-breakout',
]);

const cells = new Map(HAYRIDE_ICON_IDS.map((id, index) => [id, Object.freeze({
  index,
  column: index % HAYRIDE_ICON_GRID.columns,
  row: Math.floor(index / HAYRIDE_ICON_GRID.columns),
})]));
export const hayrideIconCell = id => cells.get(id) ?? null;
