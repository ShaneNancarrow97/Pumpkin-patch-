# Grass detail, second pass

This replaces `assets/terrain/grass-tile.webp` with a new generated fine-bladed grass texture. It is quieter and lighter than the earlier dark, clustered texture: muted sage/olive tones, smaller painted blades and less patch contrast. The existing shader mask and single shared texture loader still determine where grass appears; paths, water and soil keep their own materials.

The source is 1254×1254. Pillow performs only RGB conversion, aspect-preserving downsampling to 512×512 and WebP quality 94 encoding. The runtime is 101,386 bytes. There is no manual painting or seam retouching. Full source, prompt, provenance and runtime checksum are retained here.

`grass-repeat-proof.jpg` shows the actual runtime tile repeated 2×2 and was visually inspected. Opposite-edge mean channel differences 8.44/7.39 are comparable to ordinary adjacent blade variation 7.42/6.40, so there is no prominent edge stripe. This is a practical repeat inspection, not a claim that opposite-edge pixels are identical.

The shader's world repeat and blend are still controlled by `src/grass-detail.js`; the world-readability contractor owns any final tuning. This art adds no meshes, lights, animations or saved fields. Final in-game colour and performance should be checked against the village's dynamic lighting.

Rebuild from the repository root with `python3 voxel/tools/bake-village-grass-tile.py`.
