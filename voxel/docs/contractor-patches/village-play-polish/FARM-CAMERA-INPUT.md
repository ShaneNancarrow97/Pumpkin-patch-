# Farm R3 zoom and pan

On the farm, clicking **R3** enters a dedicated camera inspection mode. The left stick pans in all four directions; the right stick's vertical axis zooms. R3 or Circle exits, and their press is consumed by the mode. This works from both management and controlled play without enabling/disabling or moving the owner. Village and interior R3 actions retain their existing behaviour.

A small plum/amber card uses the custom PlayStation stick/button icons, highlights Pan or Zoom while used, and shows how to leave. Its main button also toggles the mode for a pointer. The card sits above the farm dock at the screen edge and inherits the existing TV zoom and safe areas. Routine play prompts/legend are hidden while the camera owns the pad.

Farm R3 is filtered before the thumbstick cursor. It cannot activate both systems. L3 still brings up the cursor where previously allowed. Menus, placement and the action wheel take precedence; the camera mode automatically ends on travel, a menu, disconnect or loss of the farm scene.

## State and scene adapters

- `play-controls.js`: `cameraMode` and `cameraDiagnostics` expose runtime status. `releaseInput(reason)` cancels held actions, closes the wheel/cursor/hub, releases touch/keyboard input, ends camera inspection and guards held pad buttons/sticks until neutral. `main.js` calls it on village entry and exit.
- `scene.setFarmCameraMode(on)` only changes camera ownership. It never changes the playable character, play/management state or game rules.
- `scene.farmCameraInput({panX,panY,zoom,dt})` accepts bounded camera input only while the mode is active on the farm. Pan uses the current camera's ground-plane axes, independent of avatar movement. The view stays bounded by the farm's footprint. Up zooms in, down zooms out.
- `scene.farmCameraStatus` reports mode, availability, current pan/zoom and whether framing was manually adjusted. Management retains the chosen framing. Controlled play eases back onto the owner after exit while retaining zoom, rather than snapping.
- `follow-camera.js` supports a held target plus a target offset, so inspecting the farm cannot pull its subject around. No fields are saved; save version 18 remains unchanged.

## Input handoff

`ui/play-input-boundary.js` suppresses buttons already down at a scene/mode change until they are released. Each stick independently needs neutral once. This prevents a carried Cross from collecting/interacting on arrival and prevents an exit with a still-held stick from immediately walking the owner. A newly pressed unrelated button remains available. A replacement or reconnected controller is treated the same way.

## Verification

**38 focused checks passed** across the camera, input boundary, player feel, direction, navigation and existing camera suites. They cover one-shot R3/Circle ownership, held-input suppression, disconnect/reconnect, cadence-independent following, wrap/recentre, panning without moving the owner and a smooth return to following. Output: `/workspace/farm-camera-mode-tests.log`.

Final browser QA should sample a neutral pad before pressing R3, release R3, then test left-stick pan and right-stick up/down zoom. Assert that the owner position and enabled state stay unchanged, the cursor stays off, and Circle exits without also going back. Keep a stick held during exit and verify that movement remains blocked until neutral. Repeat from management mode and confirm that village/interior R3 still use their original mappings. Parent owns those browser receipts; no physical controller/TV test is claimed here.
