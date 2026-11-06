# Final station-only refinement verification

**9/9 browser checks pass** on the exact final HTML SHA-256 `00452771188d0a6cdaf1a020f34c5ed21e610520f4f15ea09f82b757e8d1aa8d`.

This focused run verifies only the later station refinements: softer tile geometry/colour, convoy visibility at the map portals, and Fold station/management layout. It supplements the complete 107-check core/POV run on the preceding `c429348…` build; financial rules, queues, save migration, owner route and scary forest scenes did not change in this final refinement.

The actual scene controller hides the farm convoy at arrival elapsed0 while outside the paved map, shows it at2.25s after entering, hides the departed convoy at3s, and shows it in loading at the platform. The fixture restores the original convoy before capture. Both final images were visually inspected. The dark grid seams are gone and the pad reads as softly varied stone/leaf litter; portals no longer dominate the station. Management fits the874×787 unfolded viewport with44px targets.

One main WebGL canvas, zero external runtime requests, and zero page/console errors. Browser settings are SwiftShader/performance with bloom/shadows/mist/lake lights off. Native fullscreen is still excluded by managed Chromium policy; the button remains available and returned farm usable. No physical Z Fold performance claim is made.
