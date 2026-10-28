# Pumpkin Patch — life-play controls

## Play
Extract Pumpkin-Patch-HTML.zip and open Pumpkin-Patch-Life-Play-Fit.html in Chrome or Safari. This is the complete offline game with art, fonts and music embedded. Test money/unlocks only exist in QA browser storage; normal starting conditions and existing saves remain.

Choose Shane or Natalie with Play. MOVE walks or jogs; LOOK rotates the camera around your character. Use Centre / R3 to return to the character. Tap once for one assisted tool use, or hold to continue tending local suitable crops. Releasing finishes the current use and then stops. Movement or Back cancels unfinished work. Walk close to a highlighted cooker, costume rack, chair, bookshelf or pet and use the context button. Arrange retains the full furniture controls.

Keyboard: WASD move, IJKL look, X/E use, Q tools, Shift walk/jog, C centre, brackets zoom. DualSense: left stick move, right stick look, Cross/Square use, Triangle tools, Circle back, L3 walk/jog, R3 centre, triggers zoom. Pair in your device's Bluetooth settings first; the game does not handle pairing itself. Hardware Bluetooth/Fold/OS fullscreen performance has not been verified by browser automation.

Side walking uses distinct contact/passing phases with uniform owner stature and foot anchoring. The watering can is an illustrated brass sprite with an animated pour. Indoor framing now leaves room around the owner, with safe zoom and stable furniture proportions. The primary action is on the right, controls are smaller and notices have intrinsic height. Farm control supports full yaw; room camera angles stay within useful cutaway views. The ordinary tycoon interface and its canonical camera remain available when leaving control mode.

## Claude pickup
Read 50-control-fit-and-sprite-can.md. Source branch: contractor/life-play at c1f6017b3a2bae64401c95b394c0fae3298094df. Runtime/CI: ec54f5a36a93edb70eddc58fc87a06274e3c544a. Apply life-play-fit-from-0d55eed.patch only after completed handover 49, base 0d55eedb662cf14e988603547592c5c5f97e7c9a, or inspect the source branch on a clean review branch. Preserve private lead work. Shared main/scene/control/sprite integration needs review; do not reset or overwrite the lead checkout. Artifact-only contractor/life-play-download contains downloads and must not be merged into source.

The small patch contains runtime art, models, code, tests and handover. Large generation PNG sources and screenshot evidence remain on the source branch. Fetch those folders before rerunning art preparation tools. State version remains 14; gestures, poses and camera state are transient. The root 2D game is untouched.

## Verification
Successful Node, browser and CI evidence is recorded in delivery.json and the source verification folder. Browser report hashes deliberately identify separate reviewed builds. Actual input, tool transactions, visible geometry, camera movement, home interactions and responsive layouts are checked; controller input is emulated, not hardware paired.

CI: https://github.com/ShaneNancarrow97/Pumpkin-patch-/actions/runs/40775581716. Both jobs pass. Clean committed-source and actually applied patch rebuilds match this HTML byte for byte; cached patch apply checks also pass.

HTML SHA-256: 51ba1b6676e8d9ec8540c7ef19b5c38a6c496b1e2a8a6b2b272c7ae01beebd8a
