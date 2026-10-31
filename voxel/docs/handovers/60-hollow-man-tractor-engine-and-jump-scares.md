# 60 — The Hollow Man, a real tractor engine, and jump scares clear of the animatronics

Branch: `voxel-reference` (lead), following handover 59. The player asked:

- "Also improve the tractor ride further, overworld, upgrades, pov experience - premium, utterly perfect, scary, exciting."
- "Add tractor sounds, you can midi-ify this" (with a recording of a tractor engine, an MP3).
- "Make sure the sprite jump scares dont interfere with the voxel animatronics."
- "Make everything get real dark with the hollow man scene and his face jack o lantern lights up and does the reveal."
- "Push html once done with ride", then "Html asap".

The farm-side asks (skins, a makeover animation, density and spookiness) are the next round; see the end.

## The Hollow Man (`hayride-stall.js`, new)

A tier-one hayride scare to buy (`content/hayride.js`, £3,600, scare 20). Bought and switched on, and never in gentle mode, the tractor dies in the deep wood. It stops 35% of the way from the bride's manor to the pursuit (`stallAlong`), and the ride runs `STALL.hold` (9.6 s) longer.

The view keeps the breakdown's clock: `run.stallT`, seconds since the tractor stopped (negative before). The wagon stands still for the hold, and the pace curve gets a `stall` kind: it slows to a crawl before the stop and lurches away fast after it. Each beat fires once (`STALL_CUES`):

| t (s) | Cue | What happens |
| --- | --- | --- |
| -2.4 | `sputter` | The engine coughs; the lamps start failing. |
| 0 | `stall` | It dies with a hiss and a clunk; the wheels go quiet. |
| 1.5 | `steps` | Footsteps circle the wagon; his face is only embers in the trees. |
| 3.8 | `breath` | Breathing, close behind. |
| 5.6, 6.9 | `ignition` | The starter turns it over; it fires once and dies. The headlamp browns out. |
| 8.4 | `hollow` (encounter) | **The reveal.** His jack-o'-lantern face catches light beside the tractor, with a whump of flame, a roar and screams. |
| 8.6 | `crank` | The starter turns once more... |
| 9.6 | `roar` | ...the engine catches with a bang, the headlamp bursts on, and the wagon lurches away. |
| 11.6 | `chase` | He runs after it. |
| 15.4 | `howl` | He howls as it gets away. |

- **Real dark** (`stallLamps(t)`): from the cough until the engine catches, every light goes out:
  - the headlamp, the lanterns and the wagon lamp;
  - the moon and sky light (down to 6%);
  - the fog and sky colour, which go near black (`dark`, applied in `hayride-world.js`);
  - the mist and the wisps (`hayride-atmosphere.js`, `dim`) and the moon's shafts (`hayride-moonlight.js`, `tick(time, light)`);
  - every block that lights itself: the lane lanterns' glass and the sets' glows (`land.glows`), plus the tractor's lenses and the wagon lamps (`rideGlows`, which follow the vehicle's own lamps).

  The only breaks in the dark are two faint headlamp flickers as the starter turns, and his face.
- **His face is the reveal** (`hollowManPlace`): it smoulders at 0.12 while he stalks the trees and 0.2 while he lurks down the lane. At 8.4 it flares to over 2 as the flame takes, then settles to a blaze with a flame's flicker. His face light (the scenes' `encounterLamp`, borrowed, so the ride keeps its fixed pool of 7 point lights) is the only light on him until the engine catches. The ride UI blooms ember red there, never the usual white flash (`.hayride-ride-flash.ember`).
- **Where he is:** before the hold, where he is goes by time: stalking the trees, then lurking far down the lane. At the reveal he stands beside the tractor's front wheel. After that, where he is goes by how far the wagon has gone, so the chase reads at any speed: he reaches as it passes, runs after it from behind, then howls and is lost.
- **The camera:** a director turns you to him (into the light, round as you pass, over your shoulder in the chase). A look of your own, or gentle mode, overrides it. The fellow riders turn to him and jump at the reveal.
- **The cinema** (`ui/hayride-ride-ui.js`, `hayride-ride.css`): `status.tension` (0–1) closes a red vignette and beats a heartbeat (`hayrideAudio.setTension`). There is film grain, and the ride's photo (taken after a frame, `afterRender`) is on the result card: the Hollow Man reaching for the wagon, or the bus without him.

## The tractor engine (`ui/tractor-engine.js`, new)

The recording was measured once, and the numbers live in the code; no sample ships.

- **What was measured:** it's a four-cylinder diesel firing about 31 times a second (27 at idle, 36 revving). One engine cycle is four firings, about 7.8 a second. `HARMONICS` holds the strength of the cycle's first 160 harmonics; the firing rate is the 4th.
- **How it's built:**
  - **The engine cycle:** one `PeriodicWave` played at a quarter of the firing rate. The firings' own harmonics (every 4th) start in step, so each firing knocks; the rest have a fixed scatter of phases. Above the 96th, the measurement is mostly the recording's hiss, so those harmonics play softer.
  - **Noise:** an exhaust band (190 Hz) and a valve band (900 Hz) pulse with the firings, under a 1.8 kHz bonnet. A clatter band above 1.3 kHz runs on its own decorrelated noise, or it cancels the bonnet's band where they cross.
  - **Small life:** a slow governor hunt, and misfires (`rough`), where a missed firing makes the next one come harder.
- **How close it is:** every one-third-octave band from 40 Hz to 6.4 kHz is within about 3.5 dB of the recording's steady stretch, most within 2 dB. The pulse at the firing rate is 0.038 against 0.030, and the crest factor 5.2 against 6.0.
- **What it does** (`engineAt(pace, stallT)` in `hayride-stall.js`, so the story lives with the story):
  - it idles while boarding;
  - it revs with the wagon's pace (`status.pace`, 1 = the usual speed), 27 to about 37 firings a second;
  - it coughs for a moment when the lamps sputter;
  - through the breakdown it chugs down and dies, cranks twice at 5.5 a second and fires once each time, then cranks a third time and catches at 46 with a roar, settling back to the pace.
- **Wiring:** `status.engine` and `status.pace` go to `hayrideAudio.setEngine(engine, pace)` every frame (`main.js`). The engine is one long voice in `hayride-audio.js`, replacing the old 39 Hz drone, and it stops and restarts with pause. The road's rumble and the wheel rattle now follow the pace, so a standing wagon is quiet.
- **The starter and the catch** are short voices on their cues (`ignition`, `crank`, `roar`); the engine itself does the turning over and the roar.
- **Checking the sound:** `.engine-render.mjs` (QA only) renders the engine alone, or the whole ride's sound frame by frame from the real ride view, through an `OfflineAudioContext` in Chromium.

## Jump scares clear of the animatronics

Each scene's sprite figure (`hayride-scares.js`, the maze's generated cast) used to stand at the middle of its voxel set and lunge through the spot where the animatronics play: the groom at the gate, the bus's zombies, the graveyard's shade. The camera also aimed at the sprite, not the set.

- **Where:** each now waits across the lane from its set and `HAYRIDE_JUMP.ahead` (3.5 units) further on (`hayrideJumpSpot` in `content/hayride-layout.js`).
- **When:** its lunge starts after the wagon has passed the set's middle, so the set plays first, while the wagon comes level. Then the figure springs from the other side.
- **The camera** finishes on the set, then turns to the sprite as it springs (`scares.lunge()` gives where its face is and how far it has sprung). The scene's lamp follows, and the riders look and jump.
- **Its own moment:** a `jump` cue (`hayride-jump-<stop>`) brings a sting, the figure's shriek and a rumble. It's never in gentle mode, and never the encounter's double scream.
- **Room for it:** the forest and the lane lanterns keep each spot clear. A lantern that would stand there steps on 4.5 units.

## On a pad

- The right stick looks around while riding; let go, and the view comes back ahead.
- Options or the touchpad pause and resume, ○ pauses, and ○ on the pause card resumes. Pausing from a pad no longer re-enters itself: the previous build crashed with a stack overflow there.

## Checking

- 597 unit tests pass. They are new or extended for:
  - the breakdown's beats, darkness, lamps, face and engine curve (`hayride-stall.test.mjs`);
  - the engine in the audio harness (`maze-audio.test.mjs`, which now knows `createPeriodicWave`);
  - the sprite scares' places and timing (`hayride-scares.test.mjs`);
  - the lantern count after the dark stretch (`hayride-layout.test.mjs`, at least 9).
- The smoke test passes 54/54. Run it with `CHROMIUM_PATH=/opt/pw-browsers/chromium node smoke.mjs`; the pinned Playwright's own browser isn't installed here.
- Browser QA scripts (`voxel/.ride-*.mjs` and `.engine-*.mjs`, not committed), all clean:
  - `.ride-stall-qa.mjs`: the breakdown frame by frame. Mean brightness is about 12/255 until his face flares. No lamp glass is lit in the dark; the brightest thing left is a rider's eyes.
  - `.ride-jump-qa.mjs`: each scene's set beat, then its sprite springing from across the lane.
  - `.ride-pad-qa.mjs`: boarding, looking, and pausing on a pretend DualSense.
- Software WebGL in QA runs at about a second a frame. Use `PumpkinVoxel.hayride.advance()` to reach a moment. Don't run the QA scripts alongside the smoke test, or screenshots time out.

## Not done yet

- **The farm round (61):** skins for the farm, with a makeover transformation as they change: warm purples and orange, green and decrepit, abandoned, cold and ghostly. Then more density, farm character and spookiness. The hayride station's look on the farm waits for that round.
- **The engine on the farm:** the tractor could use it as it leaves and returns to the station (quietly, by distance). `createTractorEngine(ctx, noise, out)` is ready for `ui/audio.js`.
