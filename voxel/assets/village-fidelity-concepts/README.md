# Original Mothlight menu illustrations

`icons-source.png` is the unchanged original transparent illustration sheet generated for this reference-directed visual pass on 13 November 2026. The brief was an original cosy-gothic village set in antique brass, plum leather and ivory parchment: moth journal, moth brooch, folded map, neighbours, satchel, anvil, cottage, lantern and discovery sprig. It contains no copied game artwork or lettering.

The source painting is not imported by the runtime. Reproduce the transparent crop/connected-illustration isolation and aspect-preserving atlas preparation from `voxel/`:

```sh
python tools/prepare-village-fidelity-icons.py
```

The resulting `assets/village-fidelity/icons.webp` is one 768×768 texture with nine 256px cells. The adjacent JSON receipt records source/runtime hashes, measured crops and size. DOM text supplies accessible labels; illustrations are decorative. The master and original generation output remain preserved.
