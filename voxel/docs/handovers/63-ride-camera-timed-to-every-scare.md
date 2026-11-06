# 63 — The ride's camera, timed to every scare

Branch: `voxel-reference` (lead), following handover 62. The player asked:

- "Review the pov facing and timings to enjoy each scare fully and tracking of the hollow man, stop watching him when coming up to the next scare."

## What a whole ride showed

`tools/ride-camera.mjs` (new) runs a whole owner ride-along in Node, with the real ride world, view and scare cast, and measures how far off the middle of the view each scene, its sprite and the Hollow Man are as they play. Before this round it showed:

- **The pursuit played behind you.** The Hollow Man chased and howled for 36 units after the breakdown, but the pursuit is only 22 units on, and the director gave him priority. From 12 units before the pursuit until well past it, the camera faced backwards at him. The pursuit's set was 110° to 180° off the middle, and so was its sprite as it sprang.
- **Each scene was cut short.** The camera left the set about 1.5 s after its scream to find its sprite.
- **The skulk was half seen.** While he circled the wagon to the music box, the camera half turned (`gaze` 0.55), and he was off screen for about 5 s of the 10. A part turn was also scaled from an angle that winds past 180° as he goes round, so each lap it fell further behind him, up to about 70°.

## What changed

- **He's gone before the next scene** (`STALL`, hayride-stall.js):
  - The chase now ends 10 units on from where the wagon stood (was 24), with three lunges (was four).
  - He howls until 16 units on (was 36), then he's lost in the dark.
  - The pursuit (22 units on) starts to take the camera 11 units out and has it fully by 4, so he's gone before it does.
  - The cues follow: `stall-chase-2` and `stall-lunge-4` are gone, and the howl is at 23.4 s (was 30).
  - `hayride-stall.test.mjs` checks that he's gone before whatever scene comes next.
- **A scene coming up takes the camera from him** (`getPreviewFrame`): his gaze is scaled by `1 - ` the scene's pull (its focus weight, or its sprite's aim). The riders turn to the scene too, once it pulls harder than he does (`hollowLook`). You hear him howl behind you as the pursuit's lamps begin to fail.
- **The skulk is followed all the way round** (`gaze` 1, was 0.55). The camera follows a step behind, as if searching the dark: `frame.hollow.ease` is 2.8 a second while he skulks, 4.6 otherwise and 7 when he's frantic. A part turn now blends along the short way round, so it can't wind up behind him. His flickering face stays within about 25° of the middle of the view.
- **Each scene holds after its scream** (`hayrideFocusWeight`): the set is held until 2 units past its middle (was 1), about 2 to 3 s after the scream.
- **The sprite whip is faster** (`hayrideScarePose`'s `aim`): from 1.5 units before its spot, fully by 0.6 (was 2.4 and 0.8). It still lands before the spring, which starts at 0.5 before.
- **The heartbeat hands on:** after the breakdown, `tension()` is the larger of the breakdown's easing (now gone by 25 s, was 30) and the next scene's rise, so it doesn't drop away before the pursuit.

## What a whole ride shows now

| Scene | Set at its scream | Set within 12° of the middle | Sprite as it springs |
| --- | --- | --- | --- |
| Scarecrows | 0° | until 2.2 past | 3° |
| Spiders | 3° | 9.7 before to 5.2 past | (none) |
| Manor | 1° | 6.6 before to 2.2 past | 3° |
| Pursuit | 1° | 6.8 before to 2.2 past | 2° |
| Bus | 1° | 6.8 before to 2.2 past | 8° |
| Graveyard (route 2) | 2° | until 2.2 past | 5° |
| Thicket (route 2) | 2° | 6.6 before to 2.2 past | 4° |

- **The scarecrows** sit 13° to 24° to the left on the approach. The camera is held ahead inside the hill (`hayrideUnderHill`, as before), and it settles on them as you come out.
- **The Hollow Man** is in view (within 45°) 81% of the time he's out; the rest is mostly his stalk in the trees before the music box. He's last seen 5.9 units before the pursuit.

## Checking

- **608 unit tests pass.** New or changed:
  - in `hayride-stall.test.mjs`: he's gone before the next scene; a coming scene takes the camera from him, with the real ride world; the skulk is followed; and the chase's three lunges;
  - in `hayride-layout.test.mjs` and `hayride-scares.test.mjs`: the new hold and whip.
- **`node tools/ride-camera.mjs [0-2]`** gives the table above; `--rows` prints it unit by unit, and the breakdown second by second.
- **Browser checks** (`voxel/dist/qa/ride-director-qa.mjs`, not committed):
  - the manor at its scream and held after it;
  - the whip to its sprite and the spring;
  - the skulk at 7, 8.6, 10 and 12 s;
  - the howl, the turn away from him, and the pursuit's scream and sprite.

## Not done yet

As in 61 and 62:

- **The farm round:**
  - skins with a makeover transformation;
  - density, farm character and spookiness;
  - the hayride station's look on the farm.
- **The tractor engine on the farm.**
