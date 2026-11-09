# Dialogue camera contractor handover

`src/village-dialogue-camera.js` adds a temporary two-person shot for village conversations. It frames the player's and neighbour's full bodies in the upper world, leaving the bottom 38% for the speech ribbon and reply stack. Side-by-side Fold/landscape/TV layouts also keep both bodies within the left54% of the screen, clear of the tall right-hand reply column. Portrait phones retain a centred over-the-shoulder angle; wider screens use a three-quarter view. Both retain a sensible minimum distance rather than enlarging a sprite to fill the display.

The helper is independent of saved state, quest rules, player movement and the exploration follow rig. It snapshots the shared camera position/quaternion, controls target and enabled state once. Greeting → chat/quest replacements keep that first snapshot, including when a close has already started a return transition. Close eases back to the snapshot; reduced motion, leaving the village and disposal can restore it immediately.

## API and coordinates

```js
const shot = createVillageDialogueCamera({ camera, controls, reducedMotion, groundAt });
shot.begin(playerWorldFeet, neighbourWorldFeet); // false for invalid/unframeable targets
shot.tick(dt);                                  // while the view is active
shot.resize();                                 // after camera aspect/FOV updates
shot.end();                                    // smooth return
shot.end({ immediate: true });                  // leaving/tour interruption
shot.dispose();
```

`begin` receives finite Three-world feet positions `{x,y,z}`. The existing village adapter converts realm `{x,z}` to world `{x,y:groundAt(x,z),z:-z}`; an actual actor feet height should be retained when supplied. The helper adds character height itself. Its terrain callback follows the existing realm convention `(worldX, -worldZ)` and is called only while planning. Interior adapters should use the hall's floor instead of sampling terrain at its remote 4,000-unit scene offset.

`active` includes entering, focused and returning phases. `status` provides diagnostic mode, distance, finite subject positions and whether the planned frame fits. No status field is persisted. `villageDialoguePose(...)` is the pure planning export for tests or scene review.

## Integration dependencies

| Owner | Hook | Requirement |
| --- | --- | --- |
| Village view | Expose `view.dialogueCamera`, convert realm coordinates | Pass feet heights; update aspect/FOV before `resize()` |
| View camera loop | Suppress ordinary follow-pose writes, OrbitControls updates and framing while `active`; call `tick` | Only one camera owner may write a frame |
| Village conversation caller | Begin with actual player/neighbour positions; end on close | Scripted dialogue and greeting actions use the same shot |
| Village input | Keep movement blocked through the returning phase | Prevent walking underneath the camera before exploration resumes |
| Tour/scene exit | `end({immediate:true})` before taking ownership | Restore the snapshot and release controls without a delayed camera write |

The helper allocates planning vectors on begin/resize, then reuses vectors for every animation frame. It reads no DOM layout, adds no lights, changes no camera FOV/zoom or follow-rig values, and makes no terrain probes while ticking. Invalid or distant targets leave an existing shot and its return snapshot intact.

## Verification

`node --test test/village-dialogue-camera.test.mjs` passes seven named tests. They use real Three perspective cameras and projected body edges at phone390×844, Fold864×756, landscape844×390 and TV1920×1080 aspects. The Fold regression uses the actual owner position and Elowen's actual feet, with the measured first reply and speech nameplate bounds from candidate222. They also cover exact position/quaternion/controls restoration, replacement conversations, different frame intervals, responsive reframing, reduced motion, invalid/coincident subjects, disposal and planning-only ground probes.

The numerical frame tests establish projection/ownership correctness. Scene screenshots still need to check actual buildings/foliage and the final dialogue footprint; these unit tests do not claim structural occlusion clearance, hardware performance or Bluetooth certification.
