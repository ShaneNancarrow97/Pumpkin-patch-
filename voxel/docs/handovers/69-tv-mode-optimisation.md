# 69: Optimisation, for TV mode especially

Branch: `voxel-reference` (lead), following handover 68. The player asked: "Game optimisation? For tv mode more specifically".

## Why TV mode needs its own care

In TV mode a phone renders the game and, at the same time, encodes its screen as video for Smart View, Cast or AirPlay. The cast reaches the TV as compressed 720p or 1080p at 30 or 60 frames a second, so fine pixels and frames past 60 never arrive. Meanwhile a 120 Hz phone (a Fold 7) was drawing up to 120 frames a second at double density, and heat throttles a phone that does both.

## What changed

- **Frame pacing** (`src/frame-pacing.js`, pure, tested in `test/frame-pacing.test.mjs`). `scene.js` asks `pacer.draw(now)` each animation frame. A frame it passes over does nothing at all, and the next one runs the rules for the whole time since, so the farm's clock is unchanged.
  - **Settings → Frame rate**, saved as `prefs.frameRate`, has four choices:
    - **Auto** (the default): up to 60 a second. In TV mode it settles on a steady 30 if 60 can't be held, because even frames look smoother on a cast than uneven ones. It tries 60 again after 30 seconds and backs off (up to 4 minutes) if 60 still can't be held. Pauses over 250 ms aren't counted.
    - **Steady 30**, **Smooth 60**, and **Every refresh** (the old behaviour).
  - **Behind a centred menu** (`scene.setMenuOpen`, from `openSheet` and `closeSheet` in `main.js`), the dimmed farm draws at most 24 frames a second.
  - **Shadows** redraw every other frame at 30 or fewer, otherwise every third.
- **TV render profile** (`scene.setTvProfile`, switched by `createTvMode`'s `onChange`):
  - `render-quality.js` `TV_RENDER` caps the density at 1.5 and the buffer at 1.6 million pixels, below whatever Render detail allows.
  - The glow's blur chain runs at half size (`bloom.setSize` is wrapped).
  - The FXAA pass is off.
- **An open menu redraws five times a second** for its live numbers (timers, counts), down from every frame. Anything the player does still redraws it at once through `ui.draw()`. Two HUD writes (the level button's label and progress) happen only when they change.
- **No forced layouts per frame:**
  - The floating words over the farm and the chat markers projected with `canvas.clientWidth`. After the previous float's style write, each read forced a layout.
  - The play prompt read `getBoundingClientRect()` every frame.
  - Both now use the canvas size and place kept at the last resize (`viewW`, `viewH`, `viewRect` in `scene.js`).
- **No frosted glass** in TV mode or on a touch screen (`tv-mode.css`). The backdrop blur was worked out again every frame over the moving farm, and the panels behind it are about 90% opaque anyway.

## Measured

`dist/qa/tv-perf.mjs` (not committed) measures at a Fold's density (2.625), with a touch screen:

| | Without TV mode | TV mode |
| --- | --- | --- |
| Folded, landscape (882 × 344) | 1764 × 688 = 1.21M pixels a frame | 1323 × 516 = 0.68M (−44%) |
| Unfolded (832 × 750) | 1664 × 1500 = 2.50M | 1248 × 1125 = 1.40M (−44%) |
| Glow blur chain | full size | half size, about a quarter of the pixels |

In both modes:

- the backdrop blur is none, since both runs are on a touch screen;
- the cap is 60;
- the farm is held to 24 frames a second while a centred menu is open.

On a 120 Hz screen the cap alone halves the frames drawn.

Software WebGL here draws only a frame or two a second, so frame times on a real phone and TV can't be measured in this container; the pacing logic is unit-tested instead.

## Checks

`npm test`: 723 pass. `npm run smoke` passes, and screenshots show play mode and the legend unchanged in TV mode.
