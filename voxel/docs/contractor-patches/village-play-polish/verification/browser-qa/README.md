# Village play polish — browser verification

Runner: `tools/village-play-polish-qa.mjs [full-game.html] [evidence-directory]`.

The runner serves the supplied standalone HTML bytes unchanged over loopback, records their SHA-256 and the source hashes, and drives a standard Gamepad API mock through the actual village controller, collision rules and view. It stages a declared level-20, finished-tour, gathering-enabled farm; it does not claim these milestones were earned through play.

To avoid software WebGL spending minutes behind menus, functional assertions temporarily hold only the renderer/composer draw calls. Camera/controller/model/view logic continues with explicit 0.05-second steps. Draw calls are restored for normal-renderer screenshots and shader compilation. The test does not change the supplied HTML. Hardware performance, physical Z Fold behaviour, Bluetooth pairing and TV mirroring are not certified by emulation.

Coverage includes the closer follow camera and manual orbit; actual illustrated village hotbar/Options hub; spatial map and locked-area criteria; tree/grass visibility, footlight and proximity rings; actual Gather and Collect controls; NPC edge-rim material; compact dialogue and followed quests; visible touch/controller controls at phone, unfolded, landscape and TV sizes; repeated controller/click/Circle/walking returns to the farm; restored farm time/music/input; and bounded cosmetic wandering visitors.

The completed full run passed 57/57 checks; see [final evidence](../final-7514ee49/README.md) and its exact-hash JSON. Subsequent CSS-only build-legend changes are verified separately. Separate actual-DOM cursor/catalogue evidence lives in `../cursor-catalogue/`.
