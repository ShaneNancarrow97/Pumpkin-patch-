# Baseline visual review — Claude 604fe23

The frozen explorer HTML SHA256 is `6dbe61fe100867e0d0cc7f0bf8ea18bdd4497bcb921ed04336f86a0469792651`. These are actual browser screenshots, not concept art. Chromium used SwiftShader at desktop 1280×800, phone 390×844, landscape phone 844×390 and foldable-shaped 900×840 viewports. This does not measure physical-phone performance.

The Green reads as a coherent village: the central avenue, paired knot gardens, fountains, lanterns and circular square lead the eye to the Moth Tree. The twilight, autumn foliage and pools of warm light support the Halloween identity. The three interiors render without visible structural holes in the staged views. Shane is readable at walking scale against the avenue.

| Priority | Finding | Visible evidence | Suggested change |
| --- | --- | --- | --- |
| High | The permanent thirteen-action explorer strip makes navigation harder on a phone. Preview controls come before the village districts, so most district choices start offscreen. | Phone and landscape Green screenshots | Keep a few primary actions visible and disclose Map, Neighbours and preview tools in focused panels. |
| High | All visible navigation buttons are only 40px tall, below the project's 44px touch target. | `village-design-report.json` metrics | Use 44px minimum controls in the new shell, including dismissal buttons. |
| Medium | The walking instruction is one long, non-wrapping sentence. It occupies roughly 820px on desktop and cannot fit portrait phones. | Desktop walking screenshot | Use a short contextual prompt; place control details behind More. |
| Medium | The large crimson Moth Tree crown dominates the centre of the first view. The residents read as tiny voxel figures against it. | Desktop and phone Green screenshots | Preserve the landmark; improve resident silhouettes with painted sprites and focus the camera when meeting them. |
| Medium | Cottage windows on the Green read as grey outlined panels rather than a warm inhabited village. | Desktop Green screenshot | Use small emissive window panes and flower boxes, keeping the shared light-pool count fixed. |
| Low | Several tavern flames and the library's open notebook bloom nearly white. Red booth backs read as broad flat orange surfaces. | Interior Velvet Bat and Elowen library screenshots | Restrain glow footprint and add tonal material detail, preserving the dark cosy composition. |
| Low | Frame-rate/debug text is permanently visible and starts at 0fps while software rendering warms. | All baseline shots | Put diagnostics under More rather than on the normal playfield. |

The baseline run completed 11 functional/rendering checks with no page errors, console errors or external asset/font requests. It captured ten screenshots. Its `passed` field certifies those checks; it does not mean the design findings above were already fixed. Overlay area estimates are approximate sums of the visible HUD rectangles and do not account for overlaps.
