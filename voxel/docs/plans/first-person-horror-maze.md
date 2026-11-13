# First-person Hollow House walkthrough — implementation plan

Contractor update for Claude, based on sourcecc9dd6c. Preserve the existing voxel game, saves and one-ledger ticket simulation. Written before implementation,21October2026.

## Player flow

A restored Hollow House gains an Experience action. Inside its foyer, tap the actual maze doorway to enter. Derelict/restoring houses cannot start. The owner may inspect a restored but closed attraction. This is a free owner walkthrough: do not create a visitor, charge a ticket, occupy a queue position or award repeatable money/XP.

Entry opens a concise start card with the current tier, included chambers and estimated duration. Start is a user gesture that can unlock audio. Sound has its own clearly labelled control; volume and gentle motion are preferences, not farm save fields. Respect prefers-reduced-motion by default. Farm music is ducked during the experience and restored afterwards.

On Start, a first-person camera travels along a continuous authored rail at eye height. Dragging adjusts yaw/pitch within comfortable bounds without pointer lock. A sparse top strip contains Exit, room name, Pause/Resume and Sound. A thin progress indicator appears at the edge. The farm HUD, editing tools, rewards, dialogue and navigation stay hidden during the tour.

Pause freezes the ride timeline and its sounds; farm simulation continues under its ordinary pause rules. Visibility loss pauses the tour and stops audio, with explicit Resume on return. Exit is immediate and returns to the foyer, clearing all ride gestures/cues. Escape pauses during motion and closes the briefing/result. Completion offers Replay and Return, with a small factual recap and no automatic reward.

## Progression and rooms

| Existing foyer tier | Added chamber | Atmosphere and staging |
| --- | --- | --- |
| 1 | Forgotten passage | Worn oak, narrow masonry, candles, dust, a shuttered recess and a basic scare actor |
| 2 | Cobweb cellar | More turns, overhead webs, coffin/recess reveal, crawling shadows and a second scare |
| 3 | Séance parlour | Portrait gallery, floating spirits, violet fog and shifting eyes |
| 4 | Storm laboratory | Brass coils, teal current, machinery drone and an undead reveal |
| 5 | Velvet crypt | Gothic arches, deeper fog, an apparition finale and warm exit |

The rail expands with the tier. Tour pacing is a presentation timeline, separate from the abstract guest visit timer; changing the camera must not change guest economics or occupancy. Each tour snapshots tier/active owned haunts, so buying upgrades afterwards affects the next run cleanly.

The existing five purchasable prefab IDs are the authoritative modifiers: cobweb-canopy, whispering-portraits, spectral-parade, thunder-chamber and phantom-finale. Only active, owned, tier-valid prefabs add their extra encounters. Tier baseline rooms remain playable without purchased haunts. No duplicate upgrade shop or new currency.

## Scare staging and art

Use a small original scare-actor atlas matching the painted Halloween cast, with lurking/reveal poses, stable ground anchors and common character scale. Existing visitor art is the visual reference. Actors hide in physical recesses, move out towards the route, face the viewer, then withdraw; they are world objects, not fullscreen image overlays. Generated menu/control art is packed in a small reusable icon atlas.

Every encounter has an id, time, duration, chamber, position/side, intensity and sound cue. Use anticipation, reveal and retreat envelopes. Basic encounters exist at each tier; purchased haunts add specialised web/portrait/ghost/storm/phantom sequences. Keep encounters spaced and deterministic, with no rapid strobe, camera teleport or uncontrolled full-volume sound. Gentle mode reduces lunge distance and removes head bob/shake without deleting readable staging.

## Runtime architecture

- `content/maze-ride.js`: pure tier/chamber/rail/encounter definitions.
- `rules/maze-ride.js`: build a sanitised snapshot, gated availability, finite timeline state, pause/resume/replay and exactly-once cue emission; no DOM, audio, meshes or economy mutations.
- `maze-ride-world.js`: native voxel corridors/chambers, sealed walls/ceilings, clear route, fixed bounded lights, fog and decorative effects. Batch geometry and cache per tour signature.
- `maze-ride-view.js`: dedicated scene/perspective camera, smooth rail sampling, bounded touch look, aspect-aware resizing, actor/effect transforms and status/diagnostics. Integrate into the existing renderer/composer, not a second canvas/WebGL context.
- `maze-ride-actors.js`: embedded generated atlas loader/UV frames, alpha cutouts, common anchors, stable billboard orientation and disposal.
- `ui/maze-ride-ui.js` + CSS: briefing, sparse ride controls, pause/result states and keyboard/visibility handling; no farm menu trees while riding.
- `ui/maze-audio.js`: offline bounded Web Audio drone, footsteps, creaks, chains, whooshes and stings with a compressor/short fades. No network, autoplay or third-party audio dependency.
- `main.js`, `scene.js`, foyer doorway picking and attraction menu connect entry/return/audio/camera without touching simulation receipts.

Use existing Three.js and native JS. No framework or physics engine migration: the camera is constrained to a validated route and the experience has no free movement/physics.

## Rendering/input/audio constraints

Camera stays inside the corridor floor volume at about1.65m eye height. Turns use safe look-ahead and smooth interpolation; keep sufficient opening width at bends to avoid cutting through walls. Near plane must not clip a scare actor. Fog limits visibility while pools of warm/teal light preserve route readability. Avoid completely black screenshots or flat unlit walls. Use emissive props/fixed point-light pools rather than adding/removing lights per scare. Cleanly disable orbit/pan/build picking while ride input is active.

Audio begins only from a gesture. The ride has its own mute/volume control and must stop/fade all active sources on pause, Exit, visibility loss or restart. Bound simultaneous voices; route all ride audio through gain/compression. Restore the previous music mix when leaving. Use fresh event IDs per replay so a cue is heard once per run, never duplicated after resume.

Mobile controls have44px minimum targets and12px minimum text. Safe areas, portrait, landscape and unfolded Fold layouts must be checked. Keep progress/controls near edges and readable over fog without covering the central view. Honour reduced motion. Fullscreen remains available from the ride UI if useful, with the existing browser fallback.

## Verification / completion criteria

1. Pure tests for availability, tiers, owned-active gating, finite route/clock sampling, pause/large-dt cue idempotency, replay and completion.
2. Geometry checks for finite positive native boxes, bounded batches/light counts, all tier routes inside walkable space and no shared-geometry disposal errors.
3. Browser start from derelict rejection, restored-closed owner preview and ordinary open attraction; each tier visibly adds rooms and enabled haunts alter the tour.
4. Screenshots at entry, a mid-route scare and finale; inspect darkness, sprites, fog, clipping and controls at desktop,390×844,844×390 and874×787 Fold.
5. Touch look and pause/resume/Exit, hidden-tab interruption, repeated entry/replay and stable geometry/texture counts.
6. Ticket counts, coins, occupancy and saves remain governed by the existing simulation. An owner tour itself never modifies them. Full rule/art test suite still passes.
7. One offline HTML with all art/audio embedded; no external runtime requests. Build downloadable HTML/ZIP, source commits, explicit incremental patch base and Claude handover. Push only contractor source/artifact branches.

## Deferred scope

This delivery is a guided attraction experience. It does not add free-walking collision/combat, a maze layout editor, VR, paid player tickets, new currencies or the cooking/20-level roadmap. Existing attraction management and foyer decoration remain available outside the tour.
