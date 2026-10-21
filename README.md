# Pumpkin Patch — house fix and mobile rendering update

Download Pumpkin-Patch-HTML.zip, extract it and open Pumpkin-Patch.html in your browser.

Source: contractor/haunted-house-estate, commit ba2ffa459fad34aa8b47cf47cbfdc0dacb1c03e8.

Fixes the unpaid guest exit reset when closing the Hollow House. Reduces high-DPI world, mobile shadow and postprocessing costs. Full device freeze was not reproduced locally; 26 attraction browser checks and 29 unit-test files pass. Existing saves preserved.

Claude: see voxel/docs/handovers/17-house-freeze-and-render-cost.md on the source branch. The contractor ZIP includes the full source patch and handovers. Do not merge this downloads-only branch into the game source.
