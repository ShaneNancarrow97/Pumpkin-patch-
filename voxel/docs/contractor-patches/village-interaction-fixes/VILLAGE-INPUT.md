# Village interaction fixes — contractor handover

This part starts from `7bb7639` on `contractor/village-interaction-fixes`. It changes the village input/controller adapter and its tests. No save fields, progression, currency rules, world geometry or shared farm camera behaviour change.

## Root causes and resulting controls

The village pad boundary previously marked both sticks as needing neutral on every `release()`, even when the device was already neutral. Closing a menu and pushing a stick before another neutral poll therefore swallowed a valid fresh gesture until the player released again. The boundary now snapshots the actual current pad at the event. A neutral stick is immediately armed; a held stick still needs its own neutral position. Button holds remain suppressed until released, independently of each stick. Focus/visibility hand-offs use the same explicit release boundary.

The follow rig's positive yaw moves the camera around its target, which turns the viewing ray in the opposite direction. Village world look now maps stick input through `villageCameraLook({x,y}) → {-x,y}`. Real Three-camera tests establish that right turns the viewing ray right and up raises it. Menu scrolling keeps the raw axes. The shared follow rig and direct canvas drag/orbit convention remain unchanged, preserving farm behaviour.

The existing village Options → Map/People/etc. handlers already activated correctly and retain a regression. The separate farm Options/cursor conflict belongs to the global controller owner. This patch does not add a second controller router or reset the player's camera to disguise a stuck input state.

## Return confirmation

Header Farm, root Back/Circle, the carriage interaction, quest-menu farm actions and crossing the walking exit now call `requestReturn(reason)`. The new modal is a presentation helper; the village controller owns input edges and travel. The opener is consumed and held Cross cannot also confirm. A fresh Cross proceeds; Circle cancels. Keyboard Escape is edge-like, so a repeated held key cannot toggle the prompt repeatedly. Pointer/touch buttons remain native controls.

Canceling an automatic walking exit disarms it until the player walks away from the boundary and re-enters. Continuing to hold movement at the exit does not reopen it every tick. The actual owner can walk back from the carriage edge. Programmatic `close()` and disposal remain immediate for scene teardown.

Diagnostic `status.returnPrompt` and `status.returnPathArmed` are transient only. `requestReturn()` is public for existing application input adapters; it does not grant rewards or write a save until normal travel closes the village.

## Gather sound and completion receipts

`createVillageGame` accepts optional `onGatherSound(event)`. Its events are `{id, material, phase, job}` with a monotonically increasing transient job identifier. An accepted nearby gather emits one `start`, bounded contact `strike` events at0.3/0.8/1.3seconds as the job duration permits, then `complete` only after the real gather rule succeeds. Aborting, leaving, pausing, failing a final proximity check or encountering full ordinary stock emits `cancel`. Successful visual teardown is silent, avoiding an erroneous cancel immediately before completion. A failing audio consumer cannot block gathering or release controls.

Pausing now cancels an unfinished gather without consuming its resource or leaving a hidden job behind. Resuming requires a deliberate fresh gather. Camera return still owns movement until it finishes; holds introduced during the return cannot leak into walking.

The village forwards real `quest-done` events to `createVillageQuestReceipt`. The helper receives the already-granted reward rows rather than replaying an advertised reward. Its tick is blocked behind dialogue, panels, decorating, travel confirmation, gathering or a camera return. Scene exit clears its pending display. Farm-side quest events retain the existing notice. The receipt never grants items, changes friendship or saves again.

| Dependency | Integration hook | Preserve |
| --- | --- | --- |
| `ui/village-controls.js` | Current pad snapshot and world-only look mapping | Raw menu axes, independent neutral/held-button boundaries |
| `village-game.js` | Return requests and actual confirmation edges | Programmatic scene close; walking-exit re-entry latch |
| `ui/village-return-prompt.js` | Open/confirm/cancel/close, input glyphs | No travel in the presenter; silent teardown |
| `ui/village-quest-receipt.js` | Actual `quest-done` events and blocked tick | Rule-owned one-time rewards; no auto-focus |
| `main.js` / `ui/audio.js` | `onGatherSound: event => audio.gather(event)` | Trusted-gesture audio and material-specific sound ownership |
| `ui/village-feedback.css` | Shared prompt/receipt styling | Local TV zoom once; do not add these roots to the global zoom selector |

## Verification

`node --test test/village-game.test.mjs test/village-controls.test.mjs test/follow-camera.test.mjs` passes **50 named checks**, with no failures or skipped tests. The final log is `/workspace/village-input-final-tests.txt` in this work session. JS syntax and whitespace checks also pass.

Regressions exercise a fresh push immediately after a neutral menu close, held-axis/device replacement boundaries, real Three viewing directions, existing farm orbit semantics, Options menu callbacks, held-opener confirmation, Circle cancellation, repeated visits, a canceled exit followed by real walking away/back, accepted/remote/canceled/successful gather sound phases, pause cancellation, and actual quest-event receipt forwarding without another grant. Browser/controller and hardware validation belong to the parent integration pass.
