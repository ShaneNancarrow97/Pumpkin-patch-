# Mothlight expansion paintings

Generated with the installed OpenAI image-generation tool in this contractor session. The original PNG outputs are retained; runtime packing uses `tools/bake-mothlight-expansion-art.py` and Pillow only for measured cropping, alpha cleanup, shared-scale normalization and compression.

## References inspected before generation

- `assets/village-cast-concepts/approved-cast.png`: approved cast identities and painted Halloween palette.
- `assets/village/elowen.webp`: actual idle/contact/passing/greeting game poses.
- `assets/village-ui-concepts/source.png`: shared navigation icon style.
- `assets/kitchen-dishes.webp`: detailed finished-dish illustrations.

## Generation briefs and outputs

1. `granny-before-direction-repair.png`, output `exec-4bdf1872-8e1f-431c-b5cd-f44bb56832e9.png`: one eight-row/six-column strip of Granny Brambletooth. Moss-green skin, crooked nose, silver bun, plum shawl, apron pockets, visible boots; front through eight views, with idle, four walking phases and greeting. This initial output incorrectly faced several right-side rows left.
2. `granny-48.png`, output `exec-86ce89d4-454d-480f-9db3-91067b0ca13f.png`: whole-strip edit corrected rows 2–4 to front-right/right/back-right while preserving identity and the remaining poses. Inspected before approval. No direction was manufactured by mirroring or warping limbs.
3. `icons-12.png`, output `exec-498b046d-f24c-4a0b-821e-691cab545ef6.png`: one transparent four-column/three-row atlas. Cave, Lantern Amethyst, Ember Garnet, Hollow Opal, scarecrow maze, Granny's house, gemcraft, ward, commission, festival, companion and restoration.
4. `dishes-2.png`, output `exec-0757de78-b1a3-4371-92ec-79dad831c753.png`: one transparent two-cell sheet showing Cinder's chunky pumpkin/vegetable Lantern Stew and Granny's blackberry/apple Bramble Pudding in the same ornate plum/gold servingware as existing dishes.

## Coverage and normalization

Granny has **48 authored poses**, not 64: eight directions, four genuinely different painted walking phases, one idle and one gesture per direction. Runtime walking and idle choose those authored directions. The existing actor uses the front performance for a greeting/conversation. The directional validator accepts an explicit four-phase manifest while retaining its existing eight-phase default.

Every Granny pose uses one shared scale, a measured torso axis and the same bottom anchor. The source cleanup removes near-invisible fringes and detached neighbouring hand fragments crossing two cell edges; the manifest records these fragments. It does not repaint the figure. Granny is intentionally1.95 world units tall compared with2.3 for the other neighbours. Twelve icons are normalized into 128 px cells; finished dishes have 256 px cells.

Source hashes, alpha bounds, scale, coverage and compressed byte counts are in `assets/mothlight-expansion/manifest.json`. Rebuild with `python3 tools/bake-mothlight-expansion-art.py`. No provider key or online runtime image service is used.
