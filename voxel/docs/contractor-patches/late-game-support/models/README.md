# Standalone late-game reward props

These three floor pieces are contractor candidates, **not registered game items**.
They add no purchase, reward, save, collision or progression behaviour. Claude can
review the models independently and decide where to register them.

| ID | Name | Conservative footprint | Height bound | Boxes | Meshes |
| --- | --- | --- | ---: | ---: | ---: |
| `contract-trophy-banquet-candelabrum` | Midnight Banquet Candelabrum |1.4×1.08 |2.04 |440 |6 |
| `contract-trophy-moonlit-conservatory` | Moonlit Wardian Conservatory |1.56×1.18 |2.1 |560 |19 |
| `contract-trophy-clockwork-hayride-theatre` | Clockwork Hayride Theatre |1.6×1.2 |1.64 |619 |7 |

One world unit is the existing furniture/room unit. The usual standing owner is
2.3 units high. These are floor-mounted display pieces; the declared2×2 grid
footprint is integration guidance, not an already-installed collision record.
Their origins are the floor centre, +Y is up and the designed front faces+Z.
Every side has modelled trim, panels and objects. There is no sprite billboard,
blank rear face or hidden dependency on a fixed farm camera.

The models interpret the matching reward artwork under `../art/`: dark oak,
plum velvet, antique brass, ivory wax, lilac moonflowers and warm amber. They are
stylised voxel constructions rather than pixel-identical copies of the painted
menu sprites. The shared game `Voxels` kit batches the opaque/emissive boxes.
There are **no new lights or textures**.

## API

```js
import { REWARD_PROPS, buildRewardProp } from './models/reward-props.js';
const model = buildRewardProp(REWARD_PROPS[0].id, { animate: true });
scene.add(model);
model.userData.tick(elapsedSeconds); // absolute clock, deterministic
scene.remove(model);
model.userData.dispose();           // idempotent; stop using this instance
```

Unknown IDs throw `RangeError`. `REWARD_PROPS` is frozen metadata containing IDs,
names, descriptions, conservative world footprints, height bounds and palette.
The returned Group exposes:

- `userData.bounds`: measured resting bounds as `{ min:[x,y,z], max:[x,y,z] }`.
- `userData.animationBounds`: conservative blueprint bounds at rotation0.
- `userData.measuredSize`, `footprint`, `gridFootprint`, `height`.
- `userData.native: true`, conservative `width` and `depth`, ready for an
  explicitly registered `decorProp` adapter.
- `userData.stats`: actual box, mesh and distinct owned-material counts, plus
  `colourPassCalls` (shadow passes belong to the host renderer).
- `userData.tick(time)`, `dispose()` and `animationEnabled`.

The renderer must remove the object from its scene before disposing it. Disposal
releases owned instance buffers, materials and conservatory glass geometries
exactly once, while retaining the kit's shared cube geometry. Models do not share materials across
separate builds, so recolouring/disposal of one candidate cannot break another.

## Details and animation

The candelabrum has a carved pedestal on four feet, plum fields, all-side gilded
trim, a turned brass urn/stem, five stepped arms, saucers, wax/drips and separate
small flame assemblies. The five flames sway/flicker within the height bound.

The conservatory has an oak drawer base, iron/brass uprights, clear front/rear/
side panes, a segmented curved glass roof, roof ribs/finials, three sculpted
moonflowers, ivy, soil, little pumpkins and a golden moth. Glass shares one
restrained transparent material, uses a single colour pass and writes no depth. The moth circles inside the
case and moves its wings. The19-mesh budget includes the14 small glass panels;
all the rest is instanced, keeping this detailed hero piece below20 draw meshes.

The theatre has two drawers, complete side/rear carving and corner trim, an oval
double rail with sleepers, crooked trees, a silver crescent, pumpkins and lamps.
A green tractor and hay wagon follow separate tangent poses round the oval,
with a measured coupler between them. A right-side hand crank turns too. The
motion stays within the conservative footprint; neither track nor scenery is a
flat picture. The crescent is a solid stepped shape with a finished reverse.

## Checks and integration

From the repository root, run:

```sh
node --test voxel/docs/contractor-patches/late-game-support/test/reward-props.test.mjs
```

Tests check actual instance matrices, dimensions, finite positive box scales,
performance counts, every15-degree view over sampled animation phases,
determinism/stopped animation, unknown IDs, and resource ownership. They do not
replace the preview's front/side/rear visual inspection.

If adopted, register catalogue IDs and prices/reward claims deliberately. Add
the model's measured body to the existing `decor-sizes`/placement workflow, keep
the art/collision origin convention, and use the current room light pool. Do not
copy these metadata dimensions blindly into a rotated-cell collision formula.
