# Contractor: restore sharp scene rendering

User screenshot showed soft/pixelated room edges after the prior mobile performance change. The important cause was `composer.setPixelRatio(1)`: with bloom enabled, the complete world was rendered at CSS-pixel resolution, even when the canvas itself used a higher device ratio.

Renderer and composer now use the same bounded physical resolution. Bloom retains its own downsampled blur chain; it no longer lowers the full scene's resolution. FXAA after the output pass smooths edges in the offscreen pipeline; direct rendering retains canvas antialiasing.

Settings → Render detail offers Sharp (default, up to 2× / 4MP), Balanced (up to 1.5× / 2.5MP) and Performance (up to 1× / 1.25MP). The mode is saved in the existing preferences record. Existing users without a mode get Sharp. Resizing/folding recomputes the pixel budget.

This preserves the voxel aesthetic and existing assets. It does not claim higher device FPS. Sharp costs more rendering work than the old CSS-resolution world; users can explicitly choose the lower-cost modes. No device is silently forced into the soft mode because it has touch input.

Files: render-quality.js and pure sizing tests; scene.js composer/AA/resize/diagnostics; settings-sheet.js controls; main.js preference default/initial apply. `PumpkinVoxel.scene.renderStatus` exposes actual world/composer buffer sizes, ratios, mode and FXAA sampling resolution for support. Targeted browser QA uses a Fold-sized DPR2 viewport and checks glow on/off, all modes, persistence and folding resize; final room capture is Sharp with glow enabled.
