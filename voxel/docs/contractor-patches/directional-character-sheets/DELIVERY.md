# Directional character download and Claude handover

The full game, sprite pack and two-patch contractor handover are published on `contractor/directional-character-html`. Every link below was fetched from GitHub and checked for HTTP 200, byte count and SHA256 against `BUILD.json`.

- [Full playable HTML](https://raw.githubusercontent.com/ShaneNancarrow97/Pumpkin-patch-/85a963c246a5e982a793f29c894e0a60f46a8ced/Pumpkin-Patch-Directional-Characters.html) (55.0 MB)
- [Game ZIP — contains the same HTML](https://raw.githubusercontent.com/ShaneNancarrow97/Pumpkin-patch-/85a963c246a5e982a793f29c894e0a60f46a8ced/Pumpkin-Patch-Directional-Characters.zip) (39.7 MB)
- [Standalone animation reviewer](https://raw.githubusercontent.com/ShaneNancarrow97/Pumpkin-patch-/85a963c246a5e982a793f29c894e0a60f46a8ced/Pumpkin-Patch-Directional-Sprite-Preview.html) (12.6 MB)
- [Sprite pack — sheets, sources, metadata and preview](https://raw.githubusercontent.com/ShaneNancarrow97/Pumpkin-patch-/85a963c246a5e982a793f29c894e0a60f46a8ced/Pumpkin-Patch-Directional-Sprite-Pack.zip) (39.0 MB)
- [Claude patch kit — two patches, dependency matrix and verification](https://raw.githubusercontent.com/ShaneNancarrow97/Pumpkin-patch-/85a963c246a5e982a793f29c894e0a60f46a8ced/Pumpkin-Patch-Directional-Characters-Claude-Patch.zip) (73.3 MB)

Immutable artifact commit: `85a963c246a5e982a793f29c894e0a60f46a8ced`.
Runtime/art commit: `c2b6a409120fca3b2e1c9bc29e65316ed8570b1e`.
Verification commit: `7b62cb651eb318229414e2a76fa8d6cd1f538e95`.

The code is on `contractor/directional-character-sheets`; this delivery note is a later documentation-only commit. The patch kit starts at Living Mothlight parent `8901e18df05367d7ce38f3e0da775d07ce877a21`. Both patches were applied in a clean worktree, produced the expected tree, and rebuilt exactly the downloaded HTML. See [series replay](verification/series-apply.json) and [public download verification](verification/public-downloads.json).

Claude’s checked lead `604fe2359427fc7e90a3d1248a6c4d1d6b0136c8` is an ancestor of the source branch. That does not guarantee a conflict-free merge with newer or uncommitted lead work. Read [the dependency matrix](DEPENDENCIES.md) before transplanting adapters. No active Claude checkout was modified.

Delivered: 11 looks, eight viewing sectors, eight movement phases each. Costume, action, idle and pet expansion remains separate; [coverage](COVERAGE.md) records the precise boundaries. [Verification](verification/README.md) distinguishes scripted poses, real keyboard input, emulated controller movement and viewport checks.

Save version and game rules are unchanged. Use Settings → Save to a file before moving a farm to a different browser/file origin.
