# Integrated browser verification

The final artifact is identified by SHA-256 in `verification/final-build.json`. Tests serve the exact unchanged standalone HTML on loopback and reject a mismatched hash before Chromium starts. No external assets were requested. The controller is a mocked standard Gamepad API; menus, rules, focus routing, movement and camera methods are the actual game. This does not certify physical Bluetooth, PS5, TV or handset performance.

Only renderer/composer draw calls are suspended between deterministic input checks. Every PNG restores the normal renderer, glow, shadows and real village ticking before capture.

## Evidence and corrected fixtures

| Receipt | Meaning |
| --- | --- |
| `verification/browser-3637c529/interaction-report.json` | Original integrated pass: 36 checks passed. A later screenshot review found real Fold Play-chip overlap and added a failing geometry check. The original failure remains recorded. The chip was moved beneath the HUD on narrow screens. |
| `verification/browser-c040390b/interaction-report.json` | 17 checks passed, including corrected Farm spacing/Create artwork, both real paid tip-jar tiers, ledger stability and free display-table assignments. This report deliberately retains two setup errors: a nonexistent public Cocoa helper name, and an attempt to click a touch-only recenter button in pad mode. Its initial pad-icon check also ran before any controller activity, while the UI was correctly in touch mode. These are superseded by the targeted corrected receipt below, not silently marked passed. |
| `verification/browser-c040390b-followup/interaction-report.json` | 18/18 checks passed after using the exposed `openShopSheet('cocoa')`, actual R3 recenter and genuine pad activity before checking pad-only artwork. Includes native £250 Hospitality purchase, removal from Visitors Spending, D-pad Up toggle, real quest reward receipt, Options/Cross, immediate fresh-stick movement, Return cancel/confirm and Fold/TV target geometry. Zero runtime errors. |
| `verification/browser-c08029b9/interaction-report.json` | 15/15 checks passed, zero errors. Final CSS-only delta: the real scrolled Sandy tab/Close overlap found during visual review is corrected by reserving 54 px in the sticky tabs' width. Bounds are checked at Fold 864×756, phone 393×852, landscape 864×393 and TV 1920×1080. Final normal Farm/Sandy photographs and a clear central village path photograph are captured against this hash. |

The c080 artifact differs from c040 by the service-navigation width rule only. The c040 input, economy and reward checks remain applicable. The lead's full Node result is `verification/final-node-tests.txt`: 1,099 named tests passed.

## Actual transaction fixtures

These are declared state fixtures, not a claim to have earned a full campaign:

- A level-4 farm has the next earnings threshold ready but lacks its required house upgrade. The original run selects the real level checklist, buys the house upgrade through its rule, and verifies the warning triangle disappears.
- An owned tier-1 cocoa stand and Bring a friend upgrade permit the original £250 Hospitality purchase. The native single-tap handler changes the existing `visitorUpgrades.cocoa` field and updates Now/Next service and patience.
- An owned shop begins with tip-jar tier 3 and sufficient coins. Native purchases deduct £9,500 and £22,000, reaching tiers 4 and 5 while the separate tips ledger stays at its fixture value. Display assignment changes a table's variety without buying stock or spending coins; duplicate varieties remain disabled.
- The invitation is prepared through `inviteToVillage`, `finishTour` and the Rowan conversation rule. Completing its real final Elowen step awards £150 and two lantern posts. The receipt displays that returned rule event; it does not award rewards itself. Its Open quests button holds focus during the screenshot, legitimately pausing the built-in expiry.

## Visual limits observed

The close exit-gate view in the original receipt and the close Rowan-stall view in the follow-up can obstruct the owner with existing foreground structures. Those screenshots remain preserved as observations. The final world photograph is taken after actual controller walking to the open arrival path rather than hiding scenery or altering the camera system. Foreground-prop occlusion is a future refinement, not part of this contract's input repair. The final Sandy photo includes the normal temporary TV-help toast triggered by the viewport/TV transition; the four-size tab/Close geometry assertions are independent of that photograph.

## Reproduce

```sh
# Broad input/resource/Return regression against its recorded candidate hash:
INTERACTION_EXPECTED_SHA=<that artifact SHA> node tools/village-interaction-fixes-qa.mjs <file.html> <output-directory>

# Final focused visual delta; execute only one Chromium at a time:
INTERACTION_DELTA_SECTION='final layout|clear path' INTERACTION_EXPECTED_SHA=<final SHA> node tools/village-interaction-ui-delta-qa.mjs <file.html> <output-directory>
```

The focused runner also supports `INTERACTION_DELTA_SECTION='sandy|village'` for the corrected service/input cases. Leaving the filter unset runs the full delta suite. Phone and TV fixtures use viewport/TV-mode emulation; they are not physical-device certification.
