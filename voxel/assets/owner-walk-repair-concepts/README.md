# Base owner walking repair

This replaces the two owners' 64-cell walking sheets with complete generated eight-phase strips for each of the eight views. Existing poses often lifted the same visible leg in both halves, despite differing pixels. The replacement makes the foreground cargo-pocket leg or brighter jeans leg change between weight-bearing and forward-knee swing, with the far leg taking the opposite role. Contacts, knee passing, toe-off and heel preparation are separate drawings; arms counter-swing.

The inputs retain the shipped faces, beanie, glasses, hair, clothing, proportions and empty hands. `shane/` and `natalie/` contain original generated strips, prompts, decisions and source crops. Rejected/candidate art remains marked. Shane's front contact and profile landing required targeted corrections before approval. His profile toe-off replacement is separately recorded. These are generated painted sprites, with small details varying between views; they are not motion capture or a certified anatomical rig.

`compose.py` technically crops and registers the accepted drawings; it never draws a limb, mirrors a direction or invents a phase. Each direction's full strip uses one scalar and a shared pelvis/floor registration. The ordinary directional baker then applies one common scalar per character to create the shipped 128×176 cells, body height 144px, root (64,164). The standing idle artwork, tool gestures, costumes and nine other directional residents are preserved.

To regenerate staging:

```sh
python3 voxel/assets/owner-walk-repair-concepts/compose.py shane
python3 voxel/assets/owner-walk-repair-concepts/compose.py natalie
```

The accepted staged sources are copied to `assets/directional-sprite-concepts/shane-base.png` and `natalie-base.png`; their source manifest declares 320×360 cells and root (160,340). Then run `python3 tools/bake-directional-sprites.py` from `voxel/`. `before/` retains the former source/art and a checksum set. Only the two base WebP hashes change; the nine other atlases stay byte-identical.

`final-foot-contact-measurements.json` identifies the same near foot's heel/toe contacts on final packed art, converts their travel through measured body height to world units, and records uncertainty. The three estimates average 1.81 world units/full left-and-right cycle and support retaining shared `BASE_OWNER_STRIDE=1.8`. The generic NPC gait default is unchanged. Distinct hashes alone are not considered evidence of a good walk.

Build the standalone owner-only reviewer with `node tools/build-owner-walk-preview.mjs <output.html>`. It embeds both new atlases and previous art, permits direction selection and phase scrubbing, and advances phases by travelled distance at selectable speeds. It retains phase during a direction change. GIFs and key-pose comparisons show the visual difference; final in-game movement review remains part of parent verification.
