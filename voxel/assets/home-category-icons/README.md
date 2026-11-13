# Illustrated home catalogue categories

Twenty generated painted-voxel icons cover all eighteen function kinds and the room/owned browsing modes. Room and inventory subfilters reuse the matching piece/mode. These are menu illustrations; existing item thumbnails and in-world models stay unchanged.

- Atlas: `home-categories.webp`, lossless RGBA, 640×512, 5×4 cells, 128px per cell.
- Pure markup: `src/ui/home-category-icon-markup.js`.
- Browser installation: `installHomeCategoryArt()` from `src/ui/home-category-icons.js`, once at startup.
- Full prompt/source/provenance: `../home-category-concepts/`.
- Rebuild: `python3 tools/bake-home-category-icons.py` from `voxel/`.
- Review: `contact-preview.jpg`, 128px and 32px sizes against the game's plum surface.

Pillow performs technical crop/packing only. Atlas gutters remain transparent; text labels are separate accessible HTML.
