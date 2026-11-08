# Natalie base walk repair sources

Eight newly drawn view strips, each 4×2 and eight successive movement phases. `selection.json` is authoritative: use `right-repair.png`, not the first `right.png` candidate. All rows use anatomical left contact at phase 0 and right contact at phase 4.

The initial right strip was rejected because phases 2/6 still resembled the same rear-boot kick. The corrected strip gives the near right knee a clear foreground lift in phase 2, the far left boot a distinct rear lift in phase 6, and opposite arm ownership at contacts 0/4. Front/back views visibly alternate which boot comes forward or presents its sole. Side/diagonal seams and occlusion help retain near/far leg identity.

`crops.json` gives explicit clear-alpha source rectangles; all borders have zero pixels at alpha≥32. `compose-review.py` uses one uniform character scale and measured torso/foot roots to assemble the optional 2048×2048 review source, atlas, contact proof, GIFs and portable HTML reviewer. It never paints or deforms body parts.

`foot-landmarks.json` records manual right-profile contact and swing-boot estimates with approximately 8px uncertainty. Contact spreads at 0/4 imply a full left+right stride around 1.8 world units for a 2.3-unit body; this supports the existing cycle rather than an arbitrary cadence increase. It is an approximate painted-art calibration, not a rig-certified foot-lock measurement. The actual in-game camera and travel need final review.

No runtime or original asset files were changed by this source task. Parent integrates both owners together and verifies the remaining nine villagers stay byte-identical.
