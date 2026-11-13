# Owner-centred play cameras

The village play camera now starts 6.8 world units from its shoulder-height target, about 6.1 units behind at a 26° pitch. Its 48° landscape / 58° portrait field of view leaves space for the owner and their nearby job. Zoom ranges from 4.8–13 units; village interiors keep a wider 9–17-unit range and a limited cutaway orbit so the character cannot fill the screen or put the camera behind a wall. The private home interior and garden keep their existing framing.

`follow-camera.js` owns transient smoothing. Its target follows the current foot position with exact exponential integration of linear travel, so the trailing distance does not change at 30/60/120Hz. Yaw wraps along the short path, manual orbit and zoom ease into place, and large world jumps start a fresh track. No camera state is added to saves.

The camera stays on the owner while the player pans around them. Village play no longer shares its camera with live OrbitControls damping: the latter is disabled during following. Canvas dragging and pinching now orbit/zoom around the owner; the right stick keeps its existing look controls. Village recentering uses the owner's actual world heading and preserves zoom. Farm R3 is subsequently assigned to the separate [zoom/pan mode](FARM-CAMERA-INPUT.md); keyboard/touch recentring remains available. Camera-relative strafing never drives automatic yaw, because that creates a self-feeding spiral. World-directed tap-to-walk may gently align behind its route after the manual-look grace period.

The farm uses the same target/orbit smoothing. `player-control.js` gives the framing callback the new position and world heading before choosing the camera-relative sprite view. This removes the one-frame mismatch between a camera turn and the authored sprite direction. Existing room cutaway controls and scale remain in place.

## Integration

- `village-game.js`: `view.play.follow(actor.position, dt, { heading, moving })`; heading uses Three world coordinates. Ordinary stick movement must not set `worldDirected`.
- Entries may use `play.reset(pos, { heading })`. The former numeric yaw argument still works.
- In the village, R3 and the centre button use `play.recenter(pos, heading)`, with `play.reset` as a fallback for older adapters/test doubles.
- `play.state` exposes camera target/angles/distance plus the actual current subject position for diagnostics.
- `village-view.js` feeds the actual subject to `tickVillageVisibility` and grass fade. It restores the hero tree when entering an interior, leaving the village or returning to an overview. Pointer capture is released on exit.
- Camera height stays above the local terrain. Obstructing hero foliage uses the separate visibility system; the camera does not raycast every voxel each frame.

## Verification

`test/follow-camera.test.mjs` verifies cadence-independent following, no strafe feedback, angle wrapping, orbit radius/centring, heading-aware recenter with retained zoom, manual look priority, safe world jumps, indoor bounds and same-frame camera/sprite selection. Together with the existing player movement, navigation and camera suites, **32 checks pass**. Log: `/workspace/village-camera-tests.log`.

These are simulation checks. The parent delivery owns final browser screenshots, touch/controller layout checks and hardware limitations.

## Village standing direction

The village passes `keepFacingOnIdle: true` to the owner sprite adapter. For Shane and Natalie's everyday looks, a non-front angle holds contact frame 0 from that existing authored direction. It stays fixed as time and walking phase change; camera orbit selects the matching direction without making the legs march. Front-facing rest retains the original approved idle portrait. Tools, release, costumes and farm/house default idles keep their previous behaviour.

This is a bounded reuse of existing art, not a new eight-direction idle animation: there is no directional breathing performance, and the stationary contact drawing has a slightly staggered stance. The metadata reports `playerAuthoredIdle` and leaves gait phase/leading leg empty while standing. Existing distance-driven walking resumes normally. The adapter and neighbouring sprite/player suites pass 23 checks, including both owners' back/left/right views, fixed feet over time, front restoration, costume isolation and original farm/house stopping behaviour.
