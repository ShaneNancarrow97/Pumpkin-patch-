# Pumpkin Patch — home & hands-on play

## Play
Extract Pumpkin-Patch-HTML.zip and open Pumpkin-Patch-Home-Play.html in Chrome or Safari. The complete game, art, music and fonts are embedded. Normal starting conditions remain; QA grants only exist in test browser storage. Keep a save export when changing file origins or devices.

Tap Play to choose Shane or Natalie. Move with the on-screen thumbstick. Walk close to a highlighted crop, cooker, costume rack or doorway and tap the context button. Tools opens the radial. Keyboard: WASD, X/E, Q. Furniture has a d-pad and 15 degree turns; More controls retains the full placement toolset.

PS5 DualSense: hold Create + PS until the light flashes, pair Wireless Controller in your phone's Bluetooth settings, then press Cross or Options in the game. Left stick moves, Cross/Square interacts, Triangle opens the wheel, Circle goes back, and Options opens Manage. Use the d-pad to browse menus, left/right to adjust choices, and bumpers to turn furniture. Browser Gamepad API support is required. Automated QA emulates controller input; physical Bluetooth hardware has not been tested.

The house now matters through 20 earned levels: visit, expand, furnish, dress, read and cook. Existing pre-v14 earned levels remain. New native voxel pieces include a usable costume rail, dressing mirror, console, ivy shelf, rug, reading bench and bedside cabinet. Pet beds and bowls support Skyla, Sandy and Maisie's cosmetic home routines. Litter reversibly lowers arrivals/capacity; clean by hand or hire Hettie for £450 at level 3. Skyla's house sprite now uses sharper sampling.

All 20 owner looks have side/back walking art, retaining the exact original front sprites. Base outfits have drawn crop poses; costume farming combines its own outfit with body/tool animation. Bespoke action strips for every costume and walking round the private garden remain roadmap work. Direct control works on the farm and in rooms; the estate retains its camera and an Enter home bridge.

## Claude pickup
Read 48-home-and-hands-on-play.md. Source branch: contractor/home-play at cb7515092474c41893e3f0c918df7e49ec23c0a0. CI/runtime commit: 6a6fe2bf1bb226489eebb882c2d535614b8165cd.

Apply home-play-from-e2cba99.patch only after completed handover 47, base e2cba9965ff852a5d844fe7ccb9912ae6fc303eb, or review/merge the source branch into a clean review branch. Preserve private work. This update changes v14 saves, progression and shared main/scene/model integration; reconcile Claude's unpublished level design deliberately. The artifact-only contractor/home-play-download branch contains downloads, not source to merge.

The patch includes compressed runtime art, models, code, tests, QA tools and handover. Large generation PNG sources and screenshots stay on the source branch; fetch them before regenerating art. The root 2D game remains untouched.

## Verification
84 Node test files pass, with additional litter-boundary regressions passing. Browser report scopes and immutable build hashes are in delivery.json. Actual movement/actions, furniture and responsive controls are tested, along with emulated DualSense inputs. No page errors or external runtime assets. Physical Fold 7, Bluetooth, controller hardware and native OS fullscreen remain unverified; existing fullscreen controls are retained.

CI: https://github.com/ShaneNancarrow97/Pumpkin-patch-/actions/runs/40588800114 passes both jobs. Clean source and actually applied patch rebuilds match the HTML byte for byte. The binary patch also passes the cached apply check on its stated base.

HTML SHA-256: e21570c0f1ce2741d960c5cc0aa608d62622053ba2e1fd751f3c7d68823ff97a
