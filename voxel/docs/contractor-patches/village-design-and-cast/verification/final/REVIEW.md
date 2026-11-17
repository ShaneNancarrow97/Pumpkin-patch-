# Final explorer visual review

Reviewed 8 November 2026, including the refined final build. The screenshots and 60 passing browser checks in `village-design-report.json` belong to `Mothlight-Village-Explorer.html`, SHA256 `3972f586706fd56998fbbb527a491834e07b69f13802cdb51271804de022e710`. They cover 1280×800 desktop, 390×844 phone, 844×390 landscape and 900×840 foldable-shaped viewports. This is an explorer receipt, not evidence of a saved farm journey; the separate game report covers that flow.

## What reads better

- The four-action dock replaces the baseline's thirteen-action strip. District choices live in Map; the preview switches and diagnostics are no longer permanent playfield furniture. The normal scene keeps the avenue, fountains and Moth Tree in view.
- Purple panels, cream copy and amber actions form one consistent hierarchy. Phone Map tiles wrap into two readable columns; landscape conversation sits beside the world; Fold conversation leaves most of the square visible. None of the measured states overflows horizontally or falls below the project's 44px control target and 12px button text minimum.
- Close controls remain distinct from the primary action. The illustrated neighbour portrait, name, role and friendship progress group clearly, although the full-body thumbnail is small at phone size. This is a possible later portrait crop improvement, not a missing asset.
- The painted cast belongs with Shane's existing illustrated sprite. Silhouettes, hats and feet remain intact, and the common world height avoids a conspicuously oversized host. The library, workshop and tavern captures show the corresponding painted host in the actual 3D room.
- The walk view retains the staged garden and lantern route without a long instruction across it. The small hint sits above the dock. Window captures show recessed panes, shutter hardware and planted boxes; the unrenovated Green homes deliberately retain their dark boarded state.

## Findings and final disposition

| Priority | Observation | Evidence and boundary |
| --- | --- | --- |
| Fixed | Elowen's restored conservatory bloomed into a large near-white patch at the left of the square. | The old whole-glasshouse emission was replaced with lit lilac glass and seven small warm panes. The final Fold Map screenshot shows the cottage and roof detail clearly, without the white blob. The village's other lighting is retained. |
| Fixed | Explorer location text retained the last Map destination while another hall was shown. | The heading now follows `view.inside`. All three hall labels and the outdoor return label pass browser checks; the library screenshot reads “Elowen's library”. The saved-game headings also identify their rooms correctly. |
| Low | Some indoor highlights still bleach details. | The library notebook, workshop lamp/forge region and tavern candles are bright; booth faces read as flat orange. The baseline already records similar indoor highlights. Their structure and host remain readable in these captures. |

The responsive screens are clear and coherent. The first review produced the two local fixes above, and the screenshots were recaptured from the final HTML. No additional runtime changes followed this final review.

## What the pictures prove

The exterior, interior, Map, conversation and walking files are screenshots of the rendered explorer. `final-cast-nine-authored-gaits.png` is a labelled QA-only contact overlay made from the shipped atlases, not a gameplay screen. It permits a direct art comparison. The browser also sampled the runtime adapter's changing frames and pixel differences between authored contacts. Cinder is a floating ghost with a changing tail glide; the generic walk-frame diagnostic's left/right labels do not imply that she has legs.

These checks do not certify autonomous scheduled resident walks, rear-facing/360° sheets, complete later-district stories, physical Fold hardware, Bluetooth controllers or mobile frame rate. Later residents can be previewed here while their districts remain gated in saved gameplay. SwiftShader is for rendering correctness, not a phone performance benchmark.
