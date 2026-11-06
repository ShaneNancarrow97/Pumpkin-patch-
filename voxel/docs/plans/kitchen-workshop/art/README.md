# Kitchen workshop menu art

Twelve generated illustrations match handover 44's warm gothic cooking atlas:
burnished copper, dark plum enamel, candlelit gold and readable silhouettes.
The artwork is drawn for menus; the six actual kitchen fittings and foods use
native voxel models in the game world.

The atlas reads left to right, top to bottom:

1. Hob
2. Oven
3. Pot
4. Pan
5. Baking tray
6. Spice shelf
7. Garden skillet
8. Harvest broth
9. Spiced roast
10. Moonfire chicken
11. Haunted pie
12. Pumpkin-spice biscuits

The unchanged approved generator source is kitchen-workshop-source.png.
icons.json records its hash, each extraction region and the shipped atlas.
The generated source's alpha bounding boxes overlap slightly around the tray's
oven mitt and spice-shelf herbs. The packer separates their connected alpha
components before cropping and scaling, retaining the art without neighbour
bleed. It does not draw replacement illustrations.

Run from the repository root:

    python voxel/tools/prepare-kitchen-workshop-icons.py

Tool dependencies are Pillow, numpy and scipy. They are not game dependencies.
The resulting assets/kitchen-workshop-icons.webp is 768×576, with 192-pixel
cells, no more than 160 pixels of content and at least 16 transparent pixels
on each side. It is under the 250 KB runtime budget. The source PNG is not
imported into the game bundle.

ui/kitchen-workshop-icons.js exports kitchenWorkshopIcon(id) and
KITCHEN_WORKSHOP_ICON_IDS. It uses the same .cooking-art markup and CSS
grid positions as the existing atlas. All six kitchen-* equipment IDs are
aliases. Unknown IDs return an empty string, allowing the caller to keep its
existing icon fallback.
