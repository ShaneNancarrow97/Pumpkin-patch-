# Sandy: lean dachshund correction

This redraw preserves Sandy’s smooth tan fur, black nose, glossy eyes, one folded and one perked ear, burgundy bandana and crescent charm. The torso is longer and narrower, with a slim waist and short legs. It replaces the previously broad, heavy body in the house and at cocoa service.

Home width falls from 2.05 to 1.45 world units (29% smaller); cashier canvas width falls from 2.6 to 1.8 (31% smaller). The actual dog pixels are scaled consistently between the house and counter rather than making the counter portrait a giant dog. The head portrait is separately cropped so the cocoa menu does not show a tiny whole dog.

The eight home state indices stay unchanged: idle, two walking images, two wag images, resting/lying, stretch and feeding. Cashier idle/blink/paw service share the same scale and paw baseline. The brass service bell is the existing approved bell, packed separately and always present; it is not drawn into the dog twice.

## Preparation

Run `python3 voxel/tools/bake_sandy_lean.py` from the repository root. It needs Pillow, NumPy and SciPy only for preparation. The script preserves one shared scale across body states, grounds all paws at y184, keeps crouches/lying poses lower, and emits lossless `home-pets.webp` so Skyla and Maisie’s decoded RGBA pixels remain exactly unchanged. A guard refuses to overwrite them if the approved baseline no longer matches. Update/review `home-pets-approved.png` and its metadata if the lead deliberately changes those other pets.

The cashier sheets are 512×320 with a shared anchor (256,312). The source is `lean-states-source.png`, a whole-sheet image edit using the approved game pet/cashier artwork as reference. `lean-walk-source.png` is a separate whole-strip walk attempt. The source PNGs stay as review files; only WebP files are imported by the game. `measurements.json` pins the reviewed runtime hashes and frame bounds. `lean-pet-preview.jpg` and `sandy-walk.gif` are review previews, not shipped textures.

## Walking limit — do not mark a complete gait done

The generator repeated the same near-foreleg-forward contact when asked for the opposite contact, even after a pose-guide retry. Those repeated contacts are rejected. The runtime retains the existing two-pose walk contract using a clear extended contact and lifted-paw passing image. It visibly moves the paw, but this is **not** an anatomically complete four/eight-phase alternating left/right gait and is **not** a 360-degree pet turnaround set. Those are still art work, and this component must not be presented as fulfilling that larger animation brief.

The pet simulation, feeding, routes, beds, moods, purchases and save format are unchanged. Native home-pet, Sandy economy and art-budget tests are run. In-engine house/counter visual verification remains with the parent release playtest.
