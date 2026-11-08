# Illustrated levels, rewards and village shortcut

Two new original image generations match the game's existing painted plum, copper, brass and amber menu artwork. They add no gameplay, progression or save fields.

| Runtime art | Purpose | Size |
| --- | --- | --- |
| `assets/level-rewards/level-rewards.webp` | Six rank medallions and six trading-card reward symbols | 512×384, 192,520 bytes |
| `assets/village-shortcut/village.webp` | Village settlement beneath a moth tree, distinct from Home | 128×128, 26,158 bytes |

The first atlas's reading order is six rank frames, then coins, upgrade, decor, costume, recipe and area. Medallion centres are intentionally quiet; numerals are crisp DOM text over the art. The rank ranges are 1–3 seed, 4–7 lantern, 8–11 moon, 12–15 moth, 16–19 manor and 20 eclipse. Each frame carries its own measured number-height anchor so the manor's roof cannot obscure the numeral.

## APIs and dependencies

- Pure `ui/level-reward-icon-markup.js`: `levelRewardIcon(id,size)`, `levelRankIcon(level)` and `levelBadgeMarkup(level,size)`.
- Browser `ui/level-reward-icons.js`: `installLevelRewardArt()`, once per page, plus the same exports.
- Generated `content/level-reward-icon-meta.js` records cell positions and number anchors.
- The owning HUD/reward UI must retain its ordinary visible text and accessible labels: icon/badge markup is decorative and `aria-hidden`.
- An unknown reward-art ID yields empty markup, allowing existing text fallbacks. Artwork never decides whether an upgrade is owned, affordable or unlocked.

Runtime import only the WebP files. Full PNG sources, exact generation prompts/provenance, individual technical crops, contact proofs and manifests remain under the asset folders for Claude's later art/voxel work. The supplied village shortcut is a dedicated settlement illustration; the area reward remains an arch.

## Reproduction and review

Run `python3 voxel/tools/bake-level-reward-icons.py` and `python3 voxel/tools/bake-village-shortcut.py` from the repository root. Pillow only crops, normalises and packs the generated art; it does not paint sprites. The level baker checks all six intended numeral anchors are opaque and quiet. Both outputs are lossless RGBA with transparent gutters and recorded SHA-256 hashes.

The contact proofs were inspected at native, 44px and 28px sizes. Source centres and sample DOM-style numeral overlays were checked; alpha/hash and JS syntax checks pass. Parent QA covers their actual HUD/card placement and controller/touch behaviour. No browser, full build or commit was performed by the art subtask.
