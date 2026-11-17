# Personal stories and companions — Claude handover

This is part of `contractor/mothlight-full-expansion`, based on the delivered Interaction Fixes source `8048fd32e5dbdf33b81d38c78c07b05ecef5be7f`. Root owns integration, final browser checks, commits and publication. No lead checkout was edited by this part.

## Delivered content

`content/village-expansion-cast.js` provides **41 authored optional personal chapters and132 physical activities**. Mabel, Tansy, Opal, Cinder, Corvus, Baron and Granny each have five personal stories. Elowen and Rowan gain three later stories alongside their preserved existing quests. Granny's five personal stories supplement her five main Acre chapters; they do not replace or duplicate their IDs.

Each chapter has a stable `cast-{resident}-{chapter}` ID, a level and friendship rank, an earlier-story dependency, opening/closing dialogue and three to five ordered activities. Four real puzzle families are used: sequence reconstruction, physical light routing, unordered ingredient/evidence selection, and stage/table-slot arrangement. Relevant stories also require actual farm cooking progress or paid material restoration. All chapter positions use world units once, at `PLAN_SCALE1.5`.

Personal chapters are marked `kind:'friendship', optional:true`. The required story gates do not depend on completing these collections. Starting a later Elowen/Rowan chapter requires the corresponding previously delivered home quest, preserving its ID and ownership.

The seven newly active profiles have three bond-band conversations each, with individual warm/curious/playful replies. Their personalities differ: Mabel discusses clothing and journeys; Tansy plants and shared gardens; Opal memory in stone; Cinder shared hospitality; Corvus welcome and performance; Baron value beyond money; Granny household folklore. Elowen and Rowan's existing18 conversations each are untouched.

All nine resident profiles are now capable of friendship. Their physical presence and access still follow district gates and actual proximity; `playable:true` does not open an area. Vesper remains a host, without a new mandatory friendship grind.

## Rewards and progression

Friendship chapters use ranks1,3,5,7,10. Their XP awards100,180,260,540,180 carry a new resident through every next rank without waiting for repeated chats or gifts. Later Elowen/Rowan chapters start from rank5 and continue through7/10. Existing friendship XP and already-claimed rank gifts are not reset.

Rewards grant real home or village inventory entries, including Root's new patterned table, gem lantern, stained glass, Granny rocker, serving board and animated Lantern Night diorama. Village furnishings use `villageDecor`; house pieces use `decor`, so invalid garden IDs cannot silently turn into bonus coins.

Finale costume pairs use the existing accepted costume art/catalogue. They are not claimed as newly generated costumes or new animation coverage. All exact reward IDs were checked against the actual house, garden and wardrobe registries. The rules owner settles rewards and bonus-coin accounting once.

## Companion interface

`rules/village-expansion-companions.js` is renderer-independent. Core owns its saved placement at `village.expansion.companions`:

```js
{ selected: null, jobs: [], gathered: {} }
```

- `freshExpansionCompanions()` / `restoreExpansionCompanions(raw)` initialise/bound the state. Unknown followers are discarded; job receipts retain at most128 stable keys.
- `markExpansionNeighbourMet(state, who)` records a valid greeting once. The controller must first enforce physical NPC proximity, as it does for existing dialogue.
- `companionInfo(state, who, area, {areaOpen})` describes actual eligibility. Meeting and rank3 are required; `areaOpen` must use the canonical area gate.
- `selectVillageCompanion(state, whoOrNull, area, {areaOpen})` changes the one selected companion or dismisses them. Pause is respected; no fee or repeated gift is granted.
- `recordCompanionGather(state, {job, material, quantity, who, capacity})` is called only after committed gathering. Stable node/cycle keys deduplicate work. Rowan helps timber/fibre, Tansy herbs/blooms and Opal stone/iron/clay: one bonus material per five matching completed gathers. Full stores, failed work, zero quantities, changed captured companions and repeated jobs give no extra. No gems, food or coins are created.
- `advanceExpansionCompanion(previous, owner, dt, {area, heading, free, canRegroup})` returns a collision-tested follow pose. It sweeps short steps, keeps the layer, and resets at a safe post on an area change. Regroup is allowed only when the view explicitly hides the actor; it never bypasses a locked area by itself.

The world owner supplies `setExpansionCompanion()` and rendering, using existing sprite actors. The runtime owner supplies nearby Invite/Dismiss options, single input ownership and the physical greeting guard. Core owns gather/mining hooks and fresh/restore integration.

## Dependency matrix

| Part | Dependency | Protection |
| --- | --- | --- |
| Personal chapter content | Core activity normaliser/validators and canonical area gates | Four mechanisms retain distinct controls and validation; optional stories never become a required district gate. |
| Profiles and friendship | Existing `freshVillage`, `restoreVillage`, `addFriendship` and rank claims | Old resident dialogue, XP, gifts and quest IDs survive; newly known residents start unmet unless the save already records them. |
| Reward lists | Actual house/garden/costume catalogues | Exact IDs validated; no painted preview is advertised as a new runtime costume. |
| Companion selection | Actual NPC proximity, rank and open area | The UI cannot invite a distant or unknown resident through a generic menu. |
| Bonus gathering | Successful underlying transaction, real capacity and node/cycle receipt | No attempt-based farming, full-store overflow or relog replay. |
| Follow view | Active layer, collision callback, existing sprite gait | No new lights, reward authority or per-frame geometry belongs in this pure helper. |

## Verification

```sh
node --test --test-isolation=none \
  test/village-expansion-cast.test.mjs \
  test/village-expansion-personal-flow.test.mjs
```

**16 named tests pass.** The nine integrated personal-story cases execute all41 chapters through the actual model rules, solve all four puzzle types without the accessible-solve shortcut, check actual inventory rewards, reject repeated grants and save/reload after every chapter. Farm cooking progress is a declared metric fixture rather than a claim of physically cooking every batch through a browser. Other checks cover no-gift rank progression, profile dialogue, pause/area gating, once-only capacity-limited help, malformed saves and collision/layer-safe follower movement.

No browser run, build, hardware performance claim or commit was performed by this part. Root's integrated exact-HTML reports remain the authority for rendering, physical controls and final delivery.

## Integration audit

A later dependency review covered the whole expansion, not just the optional cast stories:

- The four-seal aggregate must be derived from the Green, Copse, Quarry and Moor seals. Completing the Moor alone must not set it. Core now derives and sanitises that aggregate, including after a save reload; completing the Green supper late can still open the Marsh.
- The 9/12/15/18 village gates have earlier reachable story steps. Existing claimed levels remain honoured. The six new home keepsakes use real catalogue entries, story purchase gates and measured voxel models; already owned pieces retain their ownership.
- Herb beds, preparation, preservation wax, cold storage, food commissions, scenery and Baron reservations have actual farm consumers. Reward flags with no implemented consumer must not be presented as finished capabilities. The unused lighting, harvest-charm and household-visit capability promises were removed from core rewards; their cosmetic keepsakes and the actual Granny ride scene remain.
- Main festival preparation proves fresh harvesting and cooking through saved production counters. The subsequent explicit supper delivery now consumes twelve unreserved, unspoiled pumpkins and four available cooked portions exactly once; reservation, expiry and reload checks pass. Repeat restaurant commissions also consume actual unreserved food.
- World reachability checks found Rowan's original personal-story objects behind his workshop. His three later chapters now put clue/reveal objects on the public front apron at design `(64.8, 20)`, and puzzles at `(64.8, 21)`, scaled once. The sixteen cast tests pass after that correction; the world owner's final physical-route checks remain authoritative.

This was a source/rules audit. It does not claim campaign timing, physical controller testing or final browser performance.
