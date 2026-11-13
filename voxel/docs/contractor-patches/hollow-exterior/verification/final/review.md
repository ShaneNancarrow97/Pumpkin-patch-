# Exterior core and first visual review

Build: `151fc00dcd375c1e5ee3547874cfbff7c52f1dc4b2f57d29256afdeb7c373ff0`.

**46/46 assertions pass**, with zero page/console errors, zero external runtime requests and one main canvas.

The real flow covers the current purchase gate, separate purchase/restoration costs, tea-break pause, closed restoration completion, facade/context picking, highlighted door entry into the existing foyer, all four paid upgrades, distinct native models, unchanged saved data during idle effects and refreshes, cached rebuilds, live OS reduced motion, responsive portrait/landscape/Fold menus and save/reload. Owner entry creates no tickets or takings. The existing restoration contract normalises transient arrival timers; reload is compared with that normalised state.

The first-run media assertion was a harness timing assumption. This run waits for the real media query and the controller's event state, and both reduction and restoration of motion pass without a runtime workaround.

The narrower sign makes the facade and windows easier to read. The phone menu's generated stage icons remain clear and its controls fit. This build's raised dormer caps still hide their glass, and its close desktop focus puts the tallest spires near the HUD. These visual findings are addressed by the subsequent dormer-height build and wider camera used in `../polish/`; those final screenshots are the release-art authority.

Chromium uses SwiftShader/performance quality, DPR1, optional bloom/shadows/mist disabled. Viewport checks are not physical-device frame-rate approval. Native fullscreen and direct `file://` navigation are restricted by the managed browser policy.
