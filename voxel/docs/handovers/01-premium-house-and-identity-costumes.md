# Premium house sprites and corrected costume edits

Branch: `art/character-costume-expansion`, based on voxel reference 5285305. Pull this branch or cherry-pick this delivery commit. Core gameplay and root game files are unchanged.

## Delivered

12 transparent premium sprites in `voxel/assets/premium/`: copper cooking range, preserves dresser, sink island, moon canopy bed, wardrobe, vanity, hanging pan rail, spice cabinet, utensil rack, recipe/teapot shelf, crescent mirror and haunted manor painting.

Two nine-frame costume atlases are direct edits of the actual original animation grids: Natalie in Freddy stripes and fedora; Shane in Jason jacket with hockey mask raised so his own face remains visible. Original poses, proportions, visible faces and pumpkin/trowel are preserved as the edit references. Earlier identity-drifting costume drafts are excluded.

Sources: `voxel/art-source/expansion/premium/`. Original character references: `voxel/art-source/expansion/reference/`. Rebuild: `python3 voxel/tools/bake_premium.py` (Pillow). Manifest includes attachment types, pixel anchors, proposed premium prices and delivery status. The baker also writes an offline animated art review to `/workspace/Pumpkin Patch - Premium Art Review.html`.

## Integration remaining

This delivery is art-ready, not registered in the live shop. Register through voxel-local catalogue adapters. Keep save schema, economy and root game untouched. Prices are suggestions. Match wall normals and common floor projection in-engine before final sizing. All six wall decorations should use wall attachment surfaces.

Costume frames still require one shared scale and normalized foot anchors before runtime registration as `natalie-freddy` and `shane-jason`. Three idle frames then six walk frames. Preserve original base characters. Do not resize every animation frame independently. Generated files should only be modified through the baker.

Sources have alpha transparency despite warm RGB in transparent pixels. Do not color-key the brown artwork. Extraction removes alpha below 9.

## Validation and remaining scope

All 12 item and 18 costume frame extractions have nonempty alpha. Existing model and house test files pass; original standalone voxel game builds successfully. The current game HTML does not yet include these unregistered items. In-engine wall orientation, sizing and costume foot-anchor QA remain integration tasks.

Other requested costumes and visitor expansions remain separate work. Monsters Inc., Toy Story and Simpsons image generation was rejected by the image service; those assets are not included. Off-style visitor drafts are excluded.
