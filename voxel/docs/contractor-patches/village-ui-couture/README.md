# Mothlight village interface — plum, parchment and gilt

This contractor increment brings the complete village interface into the same visual family as its journal and dialogue. It extends `e99cd6e84d409e318392db2019d407487abba4ee` on `contractor/village-ui-couture`; the WebGPU/WebGL rendering implementation is retained. Claude's `voxel-reference` was checked at `8da66cb93893047d56bad874583f509ba0209d7a` before work began and its checkout is untouched.

The goal is a coherent, legible game interface: dark plum paper/leather, restrained antique-gold frames, cream text, original illustrated icons, a clear main action and useful disclosure. Opening a panel has a short easing transition; reduced motion removes it. This is an HTML/CSS presentation change, not a replacement scene, new game economy or new save format. Save version remains **20**.

## What changes

- A shared frame, title icon, type hierarchy, focus ring and responsive drawer geometry now cover the village's journal, people, inventory, workshop, trade, activity and map pages.
- Resident cards show the observed location, distance, friendship, story availability and the actual Talk/Find action. Their portraits use the existing sprite art, and accessible labels include the visible role, friendship and location details. Distant residents still require walking to them.
- The journal keeps its current objective prominent, uses explicit requirement ticks, has compact discovery guidance and acknowledges completed stories. Both quest engines and all existing reward/action routes remain authoritative.
- Dialogue retains the live character camera and canonical choices, with a clearer portrait/bond header, speech typography, gilded selection and touch chevrons. Narration controls are retained.
- The satchel emphasises useful inventory counts. The workshop prioritises ready improvements and folds later/owned content. The stall uses illustrated product cards with stock, owned counts and prices together. Explanations stay available in small disclosure sections.
- Discovery recipes, equipment, restaurant orders, cottage commissions, puzzles and rewards use the same hierarchy, without changing their prices, requirements or handlers.
- Build mode, travel confirmation, quest receipts, the actual-world map, small HUD controls and the dock use the same material language. Map place/count labels meet the shared 12px minimum, and route arrows are drawn as crisp SVG so they cannot become missing font glyphs.
- Rowan’s discovery dialogue now leads to his actual workshop, replacing an empty discovery page. Other residents retain their own recipe, equipment and commission destinations. Proximity and read-only browsing are unchanged.
- The controller's Cross legend names the focused action. Disclosures say Expand/Collapse; long names keep a bounded visible label and a full accessible name. Options closes a panel with focus restoration.

## Feature and dependency matrix

| Surface | Existing functionality retained | Dependency/check |
|---|---|---|
| Shared frame / dock | Six top-level destinations, linked subpages, close/back, stateful folds and scroll | `village-game.js`, panel trail, semantic `data-vg-*` identity, visible opener restoration |
| Map | Actual cached world snapshot, projected pins, nine area/cave choices, lock criteria, neighbour toggle, walking routes, garden/forage links | Rendering and coordinates unchanged; do not replace the snapshot with a decorative illustration |
| People / resident | Live indoor/outdoor anchors, proximity, friendship, favour, gifts, all offered stories | Original meet/action handlers; portraits never bypass physical interaction |
| Journal | Both story engines, Active/Discover/Completed, selected objective, rewards, almanac and keepsakes | Existing quest IDs and `data-vg*`/`data-vgx*` actions; no reward is granted by rendering |
| Dialogue | Canonical choices, Other stories, follow/companion gates, voice toggle/replay, cinematic camera | Reply IDs/callbacks unchanged; nested choice scrolling and controller/keyboard focus remain finite |
| Satchel | Usable counts, separate material capacities, cooldowns, Find routes, rare gems and reserved story items | Model inventory/quotes remain authoritative; do not substitute cumulative gathering statistics |
| Workshop / trade | Every improvement, prerequisite, price, owned state, one-tap purchase, home/village stock destinations | Existing handlers and disabled conditions; ready ordering does not change availability |
| Discoveries / activities | Cold store, restaurant, Granny/Tansy orders, recipes, equipment, authored puzzles, clues and rewards | All command parameters preserved; display uses current quotes and requirements |
| Decorating | Stored/placed copies, category controls, move, 15-degree rotation, storage, undo, collision and paths | Existing `data-vd-*` commands and placement rules; visual work only |
| Travel | Confirm/cancel, previous farm character, safe input release/re-arm | Existing modal; focus and controller gestures must not leak through to movement |
| Controller | D-pad/stick selection, Cross, Circle, L1/R1 tabs, R2/L2 and right-stick scrolling | New contextual label reads current focus after redraw; does not execute an additional action |
| Responsive / TV | Safe areas, portrait/landscape/Fold, actual TV root zoom, touch targets, readable text | Effective font >=12px and physical target >=44px; no compounded overlay zoom |
| Rendering / saves | Capability-selected village WebGPU, GL fallback, AO/PBR/post, farm/house/ride presentation, save20 | No rendering, rule or content file is modified by this increment |

## Integration

`build.mjs` loads `village-couture.css`, `village-story-couture.css` and `village-catalogue-couture.css` after the existing village/fidelity layers. The new rules are scoped to the live village and its own overlays; the farm UI is not recoloured. Runtime artwork is reused, so no new atlas, external request or WebGL resource is added.

Review this increment against `e99cd6e`, not against the lead branch alone: the contractor renderer/fidelity branches underneath it contain their own independently documented changes. Preserve semantic action attributes, named `<details>` and controller focus identity if moving markup in a later merge.

## Release scope

The frozen UI runtime is `6f6666a015666cdb15d3cde4dde2dadff0788ae9`. The offline HTML has SHA-256 `232535a2d4fdb6a3273314b8f152e10a175ae8db1ff7bbdbe81d3d725d2e1290`. All runtime edits are limited to village presentation, page routing and controller labels; rendering and model/content code are unchanged.

## Validation

- **1,489 / 1,489 full-suite tests passed.** The later Rowan destination regression passed separately (1); the final map-arrow change passed all 17 map tests. Runtime CSS/markup corrections after the full run are covered by the final browser checks.
- **114 catalogue comparisons** against `e99cd6e` preserve canonical IDs, parameters and enabled states across six fixtures, four pages and every resident/station combination.
- **54 compatibility checks** passed on the final HTML across desktop and phone: introduction, planting, harvesting, stock/purchases, shop, wardrobe, home/furnishing, visitors and errors. The existing smoke harness explicitly holds renderer draws; it tests logic and DOM, not frame rate.
- **81 village UI/controller checks** passed on the exact HTML, covering all six destinations, original quest tabs, actual one-tap purchase, back/focus restoration, resident/Rowan/Opal routing, real-world map, travel, reduced motion and TV/controller operation. Viewports: 1280×800, 960×540, 390×844, 844×390, 720×900 and actual Settings TV mode at 1920×1080. Visible physical targets are at least 44px and text at least 12px. Broad UI capture holds world draws after native initialization; the map snapshot is acquired with rendering restored, then its DOM controls are tested with draws held. These screenshots are explicitly prefixed `ui-only-`.
- **7 separate native-render checks** passed for desktop journal, the real nearby Rowan conversation and portrait journal. Normal game RAF and renderer/composer functions remain untouched throughout this pass.
- Final HTML: **61,789,302 bytes**, SHA-256 `232535a2d4fdb6a3273314b8f152e10a175ae8db1ff7bbdbe81d3d725d2e1290`. An independent source rebuild is byte-identical. Both browser reports record the same HTML hash, declared supplied-inventory fixture and software WebGL renderer. No page/console errors, failed requests or external requests were recorded.

[Verification summary](verification/summary.json) · [Full tests](verification/full-tests.txt) · [UI/controller report](verification/browser-ui.json) · [Native report](verification/browser-native.json) · [Catalogue comparison](verification/catalogue-parity.json)

Actual final-HTML previews: [desktop journal](preview/native-render/native-desktop-journal.png), [Rowan dialogue](preview/native-render/native-desktop-dialogue.png), [portrait journal](preview/native-render/native-portrait-journal.png). These use native rendering; they are not mockups or held-draw world previews.

Diagnostic runs that caught the stretched portrait, small action text and 11px map labels were superseded. An overlapping browser/rebuild run exceeded the runner's 8GiB cgroup and was retired; final acceptance ran sequentially. Do not substitute those partial logs or earlier hashes for this evidence.

World-framing follow-up: the staged Rowan conversation preview shows the market stall partly occluding the player. The dialogue UI is readable, but the existing conversation camera/geometry needs a separate occlusion pass near stalls.

Rendering remains inherited from `e99cd6e`: capability-selected village WebGPU with WebGL fallback; farm/house/rides/map retain their existing renderer. These checks use software WebGL and injected standard controller inputs. They do not certify physical Bluetooth, Fold/TV hardware or device FPS. No APK was rebuilt. Export/import saves in Settings when moving between browser/file origins.
