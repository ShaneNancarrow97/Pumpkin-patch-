"""Package the approved generated atlas at the size used by menu thumbnails."""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
source = root / "docs/plans/hollow-exterior/exterior-stage-icons-source.png"
output = root / "assets/hollow-exterior-icons.webp"
image = Image.open(source).convert("RGBA")
# The generator's near-2:1 canvas is normalised to eight equal square cells.
image = image.resize((768, 384), Image.Resampling.LANCZOS)
# Add a fixed transparent gutter to each complete cell. It protects the roof
# tips and foundations from neighbouring CSS backgrounds at thumbnail size.
packed = Image.new("RGBA", image.size)
for cell in range(8):
    x, y = cell % 4 * 192, cell // 4 * 192
    tile = image.crop((x, y, x + 192, y + 192))
    tile = tile.resize((160, 160), Image.Resampling.LANCZOS)
    packed.paste(tile, (x + 16, y + 16))
image = packed
image.save(output, "WEBP", quality=87, method=6, exact=True, alpha_quality=100)
assert output.stat().st_size < 250_000, "Menu atlas exceeded its shipping budget"
print(f"{output.relative_to(root)}: {image.width}×{image.height}, {output.stat().st_size:,} bytes")
