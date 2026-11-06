# Hollow House stage icon art

The new generated atlas uses the existing premium maze icons as its rendering
reference: old lilac stone, plum slate, aged brass and warm amber windows.
All eight objects have transparent surroundings and share the same front
three-quarter view. The full source stays here as an art reference.

| Cell | Icon |
| --- | --- |
| 0 | Boarded derelict house |
| 1 | Restoration scaffold and tools |
| 2 | Restored tier-one cottage |
| 3 | Tier-two porch and dormers |
| 4 | Tier-three clock tower |
| 5 | Tier-four twin spires |
| 6 | Tier-five grand haunted manor |
| 7 | Hollow House attraction crest |

Only `assets/hollow-exterior-icons.webp` is imported by the game. It is packaged
at 768×384 for 56px thumbnails (90,518 bytes). A fixed 16px transparent gutter
is added inside each square cell during packaging, preventing neighbouring
spires or foundations from leaking into CSS crops. Exact alpha is retained.
Recreate the compressed atlas using:

```sh
python3 voxel/tools/prepare-hollow-exterior-icons.py
```

The `hollowExteriorIcon(index)` markup helper uses the compressed atlas through
one Blob URL, so a refreshed management sheet does not duplicate base64 data in
each icon. Include `src/ui/hollow-exterior.css` in the single-file build.
