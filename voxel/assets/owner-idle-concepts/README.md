# Empty-handed owner standing art

The base direction sheet already contains two authored, unused front standing drawings: Shane in the last cell of his action row, and Natalie in the last cell of hers. They hold no pumpkin or gardening tool. This change uses those drawings instead of inventing new faces or freezing a walking frame.

Run `python3 tools/bake-owner-empty-idle.py` from `voxel/` to regenerate the two runtime sheets and metadata. The baker appends standing cells to the original HD atlases, so every original walking pixel stays intact. It measures the original front body height and foot offset, applies one scale per character, and preserves those physical dimensions. Existing idle slots deliberately repeat the static authored pose; they do not provide a newly drawn blink cycle.

`sprite-actors.js` substitutes the new texture/metadata only for the two base sheets. Farm, room and village actors and menu portraits share that loader. Equipped costumes and explicit tool-action atlases retain their own artwork. The optional voxel-character representation is not newly remodelled here.

The manifest records source rectangles and hashes, output hashes, measured scale and walking preservation. `test/owner-empty-idle.test.mjs` verifies output stature, anchors, alpha bounds and exact original walking pixels after decoding.
