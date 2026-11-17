# Final Build-legend CSS delta

**17/17 focused delta checks passed**, with zero browser/shader errors and zero external requests. Chromium was closed after completion.

Final standalone SHA-256: `bc7d34a08760e36b9e1004a48dae2b63d74b576dcce6622de648c3d3b60cd79e`.

The only runtime difference from the fully tested `7514ee49` candidate is `width:max-content` on the shared house/estate/foyer placement and arrangement legend. The full **57/57 gameplay checks** remain attached to [their exact original bytes](../final-7514ee49/README.md). They were not rerun or relabelled as this hash.

This candidate is rebooted from its exact unchanged standalone HTML for the focused CSS delta checks in [village-play-polish-report.json](village-play-polish-report.json). The runner is `tools/village-play-polish-css-delta-qa.mjs`. It tests house/village Build panels at 1280×800 desktop, 390×844 phone, 864×756 unfolded and 1920×1080 TV; verifies the house action legend stays on one row on desktop/TV; and restores normal draws for shader/render checks. No runtime CSS is injected.

[Updated house screenshot](04-build-house.png) was captured from these exact bytes in the first delta pass and visually reviewed: all house action hints, including More, fit one compact centred row; amber Done is clear and the selected item/angle pill sits above the bar. The original delta pass stopped after this photo because a QA selector matched both catalogue and placement legends; the corrected final run scopes that selector to the actual placement card.

The full run's declared progression fixture, renderer-hold method, software WebGL, mocked Gamepad API and hardware/audio limitations also apply here. The compact village placement card deliberately wraps its hints inside the card rather than stretching across the world.
