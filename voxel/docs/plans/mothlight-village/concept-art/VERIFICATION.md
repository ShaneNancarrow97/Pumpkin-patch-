# Concept atlas verification

Verified 2 November 2026. Scope: documentation, generated reference art, offline gallery and proposed spatial layout. No game rules or saves changed.

## Original art

- Nine original PNG boards, all 1536 × 1024.
- All images decode successfully in Chromium; no cropped board content in the gallery.
- File sizes and SHA-256 hashes recorded in `manifest.json`.
- Prompts and original generated source filenames recorded in `generation-prompts.json`.
- Visual review notes in `README.md` identify the map's glass-roof studio drift and the character-sheet precedence over storyboard incidental figures.

## Offline gallery

Chromium checked the complete gallery at 1280 × 900 desktop, 884 × 1104 unfolded foldable, 390 × 844 phone and 844 × 390 landscape phone. All nine images load at each size. No horizontal overflow, broken section anchors, page errors or external requests. Inspected desktop overview and mobile map screenshots. Purple parchment, cream type, uncropped images and full-resolution links remain readable and usable.

The gallery has no external dependencies. It honours reduced motion and supports direct local image links. This validates the concept gallery, not a newly implemented village game.

## Proposed layout

Run `python3 generate-footprint.py` to regenerate the measured SVG and check the proposed coordinates. Its envelope checks cover plots, reserved plots, paths and resource sockets; `FOOTPRINT.md` describes their limits. Real-engine collision, camera, accessible navigation and performance remain part of a future greybox implementation.

## Delivery

The final archive is checked for ZIP CRC integrity, expected board count, matching PNG hashes and local document/image links. The archive preserves the folder as an offline reference package. Take only this concept-art folder or its concept-only commit onto Claude's current branch.
