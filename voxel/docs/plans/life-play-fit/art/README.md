# Illustrated watering can

`watering-can-source.png` was generated as a standalone item edit using the approved `assets/player-directions-base.webp` character sheet as reference. It keeps the round brass can, warm golden highlights and dark cartoon outlines. It contains no hands, character, water stream or background; the runtime can keep each selected outfit and animate its own pour.

Runtime: `assets/sprite-watering-can.webp`, 256 × 184 pixels, 14,330 bytes. The handle opening and surrounding canvas are transparent. The original generation remains preserved; preparation only crops, trims negligible outer haze and downsamples.

Preparation: crop source bounds `(215, 116, 1329, 894)`, clear alpha values below 24, resize with Lanczos to 240 × 168, then place at `(8, 8)` in a transparent 256 × 184 canvas. Save WebP at quality 91, method 6, exact alpha/RGB. Pillow is only a preparation dependency; the game gains no runtime dependency.

Suggested image-space sockets (origin at top-left):

| Socket | Pixels | Normalised |
| --- | --- | --- |
| Hand / upper handle grip | (215, 52) | (0.840, 0.283) |
| Pour point on rose | (32, 116) | (0.125, 0.630) |

The unmirrored spout faces left. Mirror the item with the character's screen-facing direction. A rendered width near 0.75–0.85 world units suits the existing 2.3-unit owner stature; inspect the hand alignment in the game before fixing the final prop transform.
