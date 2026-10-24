# 26 — Fine interior placement and direct commerce controls

The UI keeps the existing compact farm HUD. New detailed controls appear only when selected/opened.

## House placement

- `rules/house.js`:0.1 placement grid, optional unsnapped positions, oriented-rectangle SAT collision for floor pieces/fixtures. Saved x/z remain the minimum corner of the enclosing footprint, so existing placed furniture is compatible.
- Rotation keeps the centre unless a room edge requires a small inward clamp; it never commits overlap with another piece or blocked stairs/doors. A slightly turned armchair can reach z0 at the back wall.
- Selected floor furniture supports one-finger drag on the actual object and two-finger rotation. Dragging elsewhere still pans the room. Touch cancellation restores the preview; invalid placement never commits.
- Preview moves only the model, hit proxy and outline in `places.js`. It does not rebuild the room on pointermove. Valid release saves once and adds one Undo entry. Continuous rotation similarly has one Undo transaction.
- `ui/home-sheets.js` and `ui/house-placement.css`: compact amber Done, rotation ring/dial, fine arrows, Snap 0.1/Free and Undo. Colour, mirror, shelves, room transfer and storage remain under More. Wall art retains its existing side-wall controls. Done clears selection.

Scene hooks: `selectedPiece`, `canDragPiece`, `onPieceDragStart/Move/End`, `canRotatePiece`, `onRotatePiece/End`. Scene adapter exposes `movePiece(instance,pose,valid)` and continuous `cellAt(...,snap)`. Interruptions finish/cancel gestures without stray taps. The finer grid changes packing precision, not room capacity or house purchase progression.

## Direct commerce

Build now has six direct tabs, including Cocoa. Land, stand purchase, stock, prices and upgrades are reachable there without another nested category. Skyla's Shop tab contains carrier-bag/tip upgrades and separate tip totals directly. Legacy standalone menus remain compatible with older shortcuts. Attraction Manage opens the actual management sheet; Haunts is one direct tab for installations, and the small building context card still works from the world.

Generated haunt icons use one cached atlas URL. New styles are included by `build.mjs`, and priced haunt buttons join amber purchase surfaces.

## Review / validation

`test/placement-controls.test.mjs` covers fractional wall packing, centre/edge-safe rotation, actual collision rejection, protected fixtures, side walls and save compatibility. `tools/qa-axel-maze.mjs` exercises purchase/restoration, haunts, map growth, special sprites, direct commerce and actual CDP touch dragging/rotation/Undo at Fold/phone/landscape sizes. See the final verification report for completed results; emulated software WebGL is not a physical Fold performance benchmark.

Cooking, ingredient deliveries and20 live progression levels remain in the earlier roadmap; this patch does not claim those systems are implemented.
