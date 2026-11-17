# 62 — The Hollow Man's roar, a free look all the way round, and a director on the ball

Branch: `voxel-reference` (lead), following handover 61. The player asked:

- "The hollow man should have a guttural roar."
- "Freelook on pov should enable 360 look around, the pov auto cinematic sequence should be more on the ball too, sometimes feels late to a scare."

## The roar (`ui/scare-voices.js`: `ROARS`, `roarRig`)

A monster's throat, not a person's, built like the screams but rougher:

1. **Two rough vocal folds** (sawtooths) an octave apart. The lower one, 18 cents off, doubles the period, and that is what makes it guttural.
2. **The pitch wanders** on two slow wobbles that never line up (`jitter`, in cents), and the rattle wanders with it.
3. **Throat noise** (band-passed at 1.1 kHz) goes in with the folds, and all of it is driven hard through the screams' waveshaper.
4. **A rattle** (`rattle`, 22 to 36 times a second, `depth`) chops what comes out, like vocal fry. It comes after the drive: the first version had it before, and the drive flattened it away.
5. **A throat** of three formants that opens with the mouth (`open`): F1 280 to 620 Hz, F2 800 to 1,200 Hz, F3 2,100 to 2,700 Hz.
6. **A chest** of low end, low-passed at 250 Hz.

There are four roars:

| Roar | Where it plays |
| --- | --- |
| `growl` | Low and shut-mouthed, building as he stretches toward you (the `stretch` cue, in place of the sinew's groan). |
| `hollow` | The big one, as his face splits open in yours (the `hollow` cue, in place of the old sawtooth roar, shriek and rattle). |
| `lunge` | Short, higher and snapping open, at each dive at the rail. Four new `lunge` cues land just before each lunge peaks. |
| `howl` | Long and open-throated, as he's left behind, muffled by the trees (the `howl` cue). |

- **Lunge timing:** `LUNGE_RATE` (hayride-stall.js) now sets both his lunges (`hollowManPlace`) and the cues, so they stay in step. The chase cue's old snarls are gone, and a pad rumbles at each lunge (`lunge` in main.js's rumble table).
- **No ghoul scream for him any more:** `SCREAMERS.hollow` is `[null, "victim"]`. The encounter plays the hit and a rider's scream only, a little later (0.95 s) so his roar lands first.
- **Measured:** rendered offline through the ride's scare bus (`dist/qa/roar-render.mjs`):
  - the big roar is as loud as the scream it replaces (about -17 dBFS RMS);
  - most of its energy sits between 150 and 1,500 Hz;
  - its rattle shows as a clear 31 Hz pulse in its envelope.

  The first version was nearly all sub-bass, so it would have sounded thin on a phone and boomy on headphones.

## Free look all the way round (`hayride-view.js`)

- **How far:** drag, or the right stick, turns the look all the way round; its yaw wraps at ±π (`wrapAngle`). Up and down now go to about ±53° (`PITCH_LIMIT`, π/3.4, was π/7).
- **A drag:** a drag across the whole screen turns about 150° (2.6 radians a screen width, but never slower than 0.004 a pixel, so a mouse isn't sluggish). The look eases the short way round to where you point it.
- **The stick:** it turns the look as far as it's pushed, and all the way over looks straight back. Let go, and the view comes back ahead, as before.
- **After a drag:** the look holds for `LOOK_HOLD` (2.5 s) after you let go, then eases back ahead, so the next scare isn't missed.
- **The director fades with your look** (`free`, gone by half a radian), and fades back in as it returns, with no snap. Before, any look switched it off outright until you came back exactly ahead, and a drag never came back at all.
- **The API:** `setLook(yaw, pitch)` wraps the yaw instead of clamping it, and `status.lookBounds.yaw` is π.

## A director on the ball

- **Sets** (`hayrideFocusWeight(ahead)`, content/hayride-layout.js): it turns from 11 units out and is fully on the set by 4 (was from 7.8, fully by 2.1), so the animatronics are framed before they play. It holds the set until a unit past its middle, then lets go by 5.5 past.
- **Sprites** (`hayrideScarePose`'s new `aim`): the camera turns to the figure from 2.4 units before its spot and is fully on it by 0.8 before. The figure starts to spring at 0.5 before, so the spring lands in view instead of the camera arriving after it. `lunge()` returns `aim` for the camera; the riders still jump at `weight`, the spring itself.
- **The Hollow Man:**
  - The gaze turns quicker: 4.6 a second, and 7 while he's frantic (was 3.4).
  - It aims where he'll be in 0.14 s.
  - It turns all the way round. It was capped at 155°, which left him at the edge of the view when he was straight behind.

  The chase's lunges now land in the middle of the view.

## Checking

- **608 unit tests pass.** New or changed:
  - in `maze-audio.test.mjs`: the roar's folds an octave apart, a rattle about 30 times a second, no ghoul scream, and each roar as one voice;
  - in `hayride-stall.test.mjs`: the lunge cues land on his lunges;
  - in `hayride-layout.test.mjs` and `hayride-scares.test.mjs`: the director's set weights and its aim at a sprite before it springs;
  - in `hayride-view.test.mjs`: the look wraps, looks straight back, holds after a drag and eases back.
- **The smoke test passes 54/54.**
- **Browser checks** (in `voxel/dist/qa/`, ignored, not committed; the session's scratch folder went away, so QA scripts and their output now live there):
  - `ride-director-qa.mjs`: the manor from 11, 6 and 4 units out and level; its sprite before and after it springs; a drag round behind the wagon, held and eased back; and the chase's lunges. It holds the ride's clock and steps it, as in 61.
  - `roar-render.mjs`: renders the roars offline in Chromium, through the ride's scare bus, to a WAV. `dist/hollow-man-roar.wav` went to the player.

## Not done yet

As in 61:

- **The farm round:**
  - skins for the farm with a makeover transformation as they change;
  - more density, farm character and spookiness;
  - the hayride station's look on the farm.
- **The tractor engine on the farm.**
