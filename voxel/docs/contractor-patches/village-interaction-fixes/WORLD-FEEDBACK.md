# Visible growth, wider lawns and real shop markers

The denser Green uses the existing saved resource cooldown as its growth clock. The view reads `M.nodeGrowthInfo(state, id)`; it does not save another timer or choose a second maturity state.

Blackroot now has five visibly different stages: bare ground after clearing, small mycelium/spore beads, crooked red-purple shoots, a young cluster with small rounded caps, then the detailed adult. These are different model prototypes, not an adult mesh flattened or scaled from zero. The mature close-up remains the 727-box domed model with thin forked roots. The canonical node's `.72–1.05` size variation applies consistently to its models. Gathering and hit boxes still become available only at maturity. Legacy decorating can suppress every stage without moving or deleting the player's item.

## Rendering budget

`createVillageResourceLayer` replaces the view's old rebuild-and-dispose resource part with **two persistent instanced meshes**. Their geometry, materials and buffers are reused. Local ordinary-resource and growth prototypes are cached. Up to eight nearby mature outbreaks use the full detailed model; farther outbreaks keep a rounded 100-box silhouette, and distant resources are culled. Growth is sampled four times a second; an unchanged stage and steady camera upload nothing. Matrices update only when a stage, visibility, node position or coarse camera/LOD selection changes. No point lights are added.

The original `buildNodes(ready, state)` export remains available for static callers and technical previews. The standalone explorer builds from `M.freshState()` through `createVillageView`, so it uses the new live growth layer automatically.

The Green's north lawn now derives its painted extent, lawn grass and woods exclusion from the actual Green polygon. The added resource sites between the old boundary and the first locked gates therefore have visible grass and open space instead of dense forest. Authored buildings, garden models, roads and gates stay in place.

## Shop emblem

Only the currently implemented, unlocked Rowan stall receives a floating shop emblem. It uses the existing painted workshop art in a translucent circular plum badge, with an upright icon and a slowly turning rim. It adds no text sign or point light. The badge reuses `type: "village-stall"` picking, hides indoors or at distance, and stays still in reduced-motion mode. See [WORLD-SHOP-MARKERS.md](WORLD-SHOP-MARKERS.md) for atlas loading and lifetime details.

## Integration matrix

| Surface | Source | Preserve |
| --- | --- | --- |
| Stage and visibility | Pure `nodeGrowthInfo` | Existing cooldown/cycles, district locks and legacy-decor suppression; no render-owned saved state |
| Local geometry | `cursedFungusGrowth` | Distinct silhouettes, positive boxes, detailed mature cap shape and original hit footprint |
| Resource layer | `village-resource-layer.js` | Two persistent buffers, cached prototypes, eight-detail cap, zero added lights |
| North landscape | Green polygon → `GREEN_NORTH` | Lawn paint, grass and woods clearing must track the navigable boundary together |
| Mature picking | Existing `nodeReady` plus shared `villageNodeHitBox` | Immature geometry is visible but cannot be harvested early; ordinary and fungus hit boxes share the rendered terrain height |
| Shop badge | `stallOpen`, canonical stall fixture | Only real shops; existing stall interaction and accurate world-space coordinates |

Diagnostics on the view: `resourceStats` reports visible patches, detailed count/cap, box counts, cached prototypes and matrix uploads; `shopMarkerStats` reports the single marker; `blightStats` keeps its existing particle diagnostics. Resource group `userData.blightSites` includes the displayed stage/scale, and `resourceSites` retains mature canonical positions.

## Verification

`node --test test/village-growth-render.test.mjs test/village-shop-markers.test.mjs test/village-blight-world.test.mjs test/village-node-sites.test.mjs` passes **23 named checks**. They cover distinct growth silhouettes, finite positive geometry, stage refresh without geometry/material replacement, the crowded-outbreak detail budget, stable-frame upload reuse, distance LOD, decor suppression, GPU disposal, mature models and path/site compatibility, plus marker visibility/picking/motion. A saved northern stone respawn on a 3.55m terrace is compared against its real instanced model bounds: both node-hit creation and later synchronisation now place the hit volume on that same terrain floor. Syntax and whitespace checks pass. Browser screenshots and the final game build are owned by the parent integration pass; none were run by this part.
