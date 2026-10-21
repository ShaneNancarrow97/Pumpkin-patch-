# Claude handover: generated premium menu icons

The user requested image-generated artwork for menu shortcuts after the minimalist UI pass. `voxel/assets/premium-menu-icons.png` is the generated lossless atlas: six columns × five rows, 30 icons. The supplied `assets/ui/home.webp`, `tools.webp` and `journal.webp` were the reference art. The requested style is painted storybook Halloween, antique amber/brass, dark aubergine, aged wood, ivory highlights and strong silhouettes, with transparent backgrounds and no embedded labels/buttons.

Reading order: Farm, Build, Attractions, Home, More, Wardrobe; Journal, Settings, Fullscreen, Music, Coins, Visitors; Plant, Boost, Harvest, Garden, Exterior, Enter; Back, Shop, Seeds, Stock, Talk, Cocoa; Rotate, Undo, Store, Sell, Close, Colour.

`ui/premium-icons.js` loads the embedded asset, finds quiet gaps between generated rows/columns, trims transparent padding and normalises every tile onto a 96px canvas. Each becomes a reusable `--menu-NAME` CSS variable. `ui/premium-icon-markup.js` contains the small DOM-free markup helper and names so the pure editor tests do not import PNG files.

The install replaces main navigation/HUD/back glyphs and upgrades the existing `.ico` shortcuts to the same art family. More-menu destinations, garden/exterior/entry controls and Decorate also use the new icons. The original controls, labels, IDs, event handlers and 44px touch targets stay intact. Text labels accompany the main actions. The atlas does not become a background panel, and the game world keeps its space. Existing glyphs remain a fallback if the image cannot load.

The new PNG is bundled into the offline HTML by esbuild. Nothing is fetched from an image host at runtime. The image is generation output; canvas code only prepares it for use in the interface. A final targeted browser check verifies all 30 tiles install, navigation remains usable and phone/Fold/landscape layouts fit. See the delivery verification record for the actual completed run.
