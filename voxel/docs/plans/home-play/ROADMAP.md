# Home and hands-on play — roadmap delta

This follows completed handover 47 on `e2cba99`. The integration details, prices, gates and known limits are in [handover 48](../../handovers/48-home-and-hands-on-play.md). “Implemented” below means the code/assets are present; final release verification is recorded separately by root.

## Implemented in this contractor increment

- Twenty earned levels with home milestones: first visit, house expansions, wardrobe use, furniture, wallpaper, books, real home cooking and installed kitchen equipment. Existing pre-v14 levels are grandfathered; new levels are not.
- A clear next-home-goal page, compact blocked-level chip and dismissible Show me prompt. Existing level celebration/reward accounting remains.
- Optional Shane/Natalie control on the farm and in home rooms: collision-aware camera-relative movement, touch stick, keyboard and gamepad mapping, nearby highlights and contextual interactions.
- Radial crop tools and furniture actions, fine d-pad movement, 15° turns, direct drag/two-finger turning, and an explicit route to the original advanced furniture controls.
- Plant/pick action presentation and a visible watering can/stream; watering adds 12% progress every 12 game seconds per plot. Existing tycoon automation remains a parallel way to play.
- Seven useful, cohesive native voxel home pieces and three pet pieces, with real measured placement bodies and actual-model menu thumbnails. Costume rail and mirror open the wardrobe.
- Cosmetic home routines for Skyla, Sandy and Maisie: walk, wag, sleep, stretch, eat/drink and use beds/bowls without imposing care costs.
- Bounded lane litter and reversible visitor footfall effect; manual cleanup and Hettie's paid level-3 caretaker service.
- Side/back walking for the existing twenty owner looks; original front sprites preserved, base drawn crop poses and costume-safe scene action animation.

## Before the release is called verified

1. Complete the all-outfit anchor/fragment review and in-engine facing checks.
2. Run the complete rule suite and CI against the final runtime, then test browser progression, real interactions and save/reload.
3. Check touch and keyboard focus in wheels and advanced furniture controls across phone, landscape and unfolded Fold-sized screens.
4. Rebuild from committed source and from the delivered patch; compare the exact standalone HTML and verify the public ZIP.

## Next contractor increment: deepen the physical loop

1. **Full action coverage.** Author coherent front/side/back planting, watering, picking, cooking and wardrobe strips for every costume, with idle-to-action transitions. The current costume action motion is scene-driven; it is not the completed bespoke strip library. Keep wheelchair actions seated and accessible, with clear wheel motion instead of inappropriate leg walking.
2. **Homestead traversal.** Add owner walking and collision round the gated private garden, retaining the 360° exterior camera and edit mode. Current Enter home is a bridge and must remain clearly labelled until traversal exists. Keep the maze/ride experiences separate.
3. **Purposeful home interactions.** Add chair/sofa sitting, bookshelf reading, dressing-mirror preview and multi-step cooker gestures that use the same transaction rules. A full controller-native recipe/wardrobe wheel needs its own accessible focus design; do not discard the proven detailed menus prematurely.
4. **Furniture ownership.** Support multiple owned instances of an item before promising separate identical dog beds, repeated chairs or multiple costume rails. Preserve current IDs and room poses through migration. Add useful table/console top surfaces only after measured sockets and collision tests are supplied.
5. **Cooking and progression pacing.** Simulate the 20-level economy with home costs and equipment/recipe requirements; ensure there is no circular gate or forced grind. Decide whether long-term cooking milestones should count completed batches or portions, then align wording and migration.
6. **Watering persistence and feel.** Decide whether cooldowns should survive reload/crop replacement. If yes, add a bounded saved crop-care field and migration rather than relying on transient `WeakMap` identity. Consider a visible damp-soil state and hold-to-water progress without increasing economic yield.
7. **Controller and touch polish.** Hardware-test Xbox/PlayStation layout labels, focus restoration, disconnects, two-finger rotation and Fold resize/fullscreen transitions. Measure frame time before introducing extra actors or effects.
8. **House companions.** Distinguish each pet's own bed, improve paths around arbitrary turned bodies and give them richer idle gestures. Keep the first version's routines cosmetic unless an explicitly designed pet-care economy is agreed.

These are follow-up tasks, not implied features of the downloadable release. Claude remains the lead owner of the broader farm/economy/world roadmap; reconcile this list with private work before implementation.
