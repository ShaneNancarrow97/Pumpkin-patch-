# Farm work and boost — design contract

User brief: upgrades for boost usage with an overheat dial; plant one plot per press; recruit Shane and Natalie separately; improve their planting/watering speed and picking capacity from one to two to three plots.

## The player loop

Plant one seed → tend the crop or spend a measured boost → pick a trained batch → sell from finite stock → recruit and train each owner. Automation takes individual turns rather than sweeping every bed. Hands-on play remains useful for manual harvest streaks and visitor boosts.

The existing big pumpkin remains tappable. Boost is still the same action whether triggered by its button, the pumpkin, Space or the control-mode interaction. Every accepted use shares one saved heat state; there is no alternative free route around overheating.

## Boost

Heat starts at 0%, gains 10 percentage points per accepted use and cools by 8 points per active game second. At 100% the candle overheats. It becomes available again at 35%, avoiding a rapidly flickering on/off threshold. The accepted use that reaches 100% still works. Rejected overheated, paused and repeated inputs add no heat, growth, tap count or idle pumpkin reward.

The original 0.14-second input spacing remains. Heat and input cadence survive a save; a tea break freezes cooling. There is no wall-clock/offline cooling. The small dial sits inside the existing Boost button, with a numeric heat reading and the word **Cooling**, not a separate obstructive panel.

| Upgrade | First / second / third price | Patch levels | Effects after each tier |
| --- | --- | --- | --- |
| Pumpkin power | £150 / £750 / £2,600 | 1 / 5 / 10 | ×1.25 / ×1.5 / ×1.75 growth per boost |
| Cooler candle | £120 / £600 / £2,200 | 1 / 5 / 10 | 9 / 8 / 7 heat per use; 10 / 13 / 16 cooling per second |

Power improves the established growth boost, not harvest yield or idle reward quantity. The idle eighth-tap pumpkin still needs barn/cart space and accepted uses. Maximum cooling cannot remove the heat limit under rapid repeated use.

## Individual helping hands

Each owner costs **£250 once** to recruit. A save that bought the old shared £500 Helping hands upgrade receives both owners, with no repeat charge. Separate new ownership is authoritative on later loads: hiring Shane does not also hire Natalie.

| Skill, per owner | Base | Training prices | Patch levels | Final result |
| --- | --- | --- | --- | --- |
| Planting | 2.4 seconds per plot | £150 / £600 / £1,800 | 1 / 5 / 10 | 1.08 seconds per plot |
| Watering | 3 seconds per plot | £150 / £600 / £1,800 | 1 / 5 / 10 | 1.35 seconds per plot |
| Picking | 1 ripe plot per 2-second turn | £350 / £1,400 | 5 / 9 | 2, then 3 ripe plots per turn |

The intermediate speed factors are ×0.8, ×0.6 and ×0.45 of the base duration. Skills belong to the owner and apply while that owner is controlled: manual planting starts at 0.8 seconds and watering at 1.1 seconds, then uses the same factors. Picking capacity changes distinct ripe plots per batch; **A little extra love** remains the separate pumpkins-per-plot upgrade.

Both helpers rest in control mode, preserving the current game's policy. Each otherwise prioritises ripe crops past their eight-second player grace, then empty beds, then thirsty crops. A cyclic cursor shares work around the field. A helper completes at most one bounded turn per simulation step; a delayed frame cannot trigger a map-wide backlog.

Watering uses the same 12-second per-crop cooldown and +12% progress as manual care. Its timestamp is now saved on the crop. Ripe timestamps are saved too, so reload cannot erase the grace period. Watering does not produce coins or change yield.

## Manual buttons and controls

- **Plant 1** plants exactly one open empty plot. Its accessible label states the remaining empty count.
- **Pick** uses the character selected in Play mode (Natalie by default), at that character's one/two/three-plot capacity. P and H follow the same limits.
- A timed control-mode pick starts with its normally reached crop, then includes only ripe neighbours within 3.2 units of both that crop and the character. The trained basket can gather the neighbouring rows; it does not reach across the map.
- All picks use the normal harvest transaction, fresh batches, barn cap, cart limits and streak rules. Multiple plots from one batch do not inflate the streak in the same instant.

## Menu structure

Manage → Farm has three inline sections: **Patch**, **Helping hands**, **Boost**. Owner portraits, recruitment and training remain together. Each price shows the real next tier, shortage or level lock. Purchases use the existing hold-to-buy and gamepad menu system. The levels list now includes the added skill/boost gates.

## Save boundary

State version is 15. `farmWork` holds boost and per-owner skills/counters; `plot.wateredAt` and ready `plot.ripe` retain crop timing. Unfinished helper jobs restart on load because their live crop identity is transient. Restore clamps malformed tiers and timers, honours legacy auto once and preserves all existing ownership/progression. `handsOn` remains transient. The save key, coin economy, level thresholds, attraction rules and visitor wallets are unchanged.
