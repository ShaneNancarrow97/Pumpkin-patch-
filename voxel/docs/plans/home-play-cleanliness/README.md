# Hettie and farm cleanliness

Paid visits leave a small physical cocoa cup, napkin or snack wrapper on the right-hand paved visitor lane after each fourth sale. No random number source, timer backlog or unbounded prop list is used. Maximum24 pieces; the first3 are cosmetic. Further litter lowers arrival pace and outdoor capacity by2.5 percentage points per piece, to a floor65%. Guests already on the farm are never removed. Cleaning fully restores the baseline.

Control-mode cleaning calls `cleanLitter(state,id)` after the UI's close-range check/action. Hettie the Night Janitor is a one-time £450 hire from level3, without hidden recurring wages. She walks at2.4 units/second to each oldest litter item, then sweeps for1.4 seconds. Her real rule-driven position and sweep state drive the eight-pose generated sprite, rather than an unrelated decorative wander. Paused games cannot hire, clean or advance.

`cleanlinessStatus` provides count, score, penalty, label, hire gate/cost and cleaned count for the home-life/manage page. The scene exposes litter as controller interaction targets. Its view adapter is a bounded group of three cloned voxel prop templates and one shared-texture caretaker; it adds no point lights. Hettie's portrait is `assets/hettie-janitor-icon.webp`.

`restoreCleanliness` sanitises IDs, duplicate items, finite lane coordinates, counters and worker position; legacy saves start clean with their current sale count as the watermark. Existing business rules retain normal behaviour at cleanliness100. The native tests cover actual pace/capacity, manual recovery, caretaker movement/purchase, pause, malformed/legacy saves and a save round trip.

The approved image-generation source `hettie-janitor-source.png` retains the full painted eight-frame sheet (four walking, four sweeping), edited from the existing visitor art reference. Run from the repo root:

```sh
python3 voxel/tools/prepare_janitor.py voxel/docs/plans/home-play-cleanliness/hettie-janitor-source.png
```

The tool crops each equal cell, applies one shared scale and a common foot anchor, then emits the222px-high runtime WebP, metadata and portrait. The runtime sheet is about130KB. The original generated images also remain in the executor's generated_images folder.
