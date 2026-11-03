# Dependency and impact matrix

| Change | Reads / writes | Systems affected | Required evidence |
| --- | --- | --- | --- |
| Boost power and heat | `farmWork.boost`, active game time, normal tap growth | Big pumpkin, button, Space, controlled interaction, idle eighth-tap reward | Shared rejection/cadence; overheat hysteresis; paused cooling; save/load; no growth or reward on rejected input |
| Per-owner hire/training | `farmWork.helpers`, coins, current patch level | Farm upgrades, manual action timing, helper simulation, legacy auto memory | One owner stays independent; correct price/gates/max; no repeat hire; old shared purchase grants both |
| Helper job scheduling | Open plots, phases, ripe age, cyclic cursor | Growth, fresh stock, harvest/cart, visible owner movement | One bounded turn; eight-second grace; tagged owner events; no catch-up sweep or duplicate harvest |
| Watering | Saved `plot.wateredAt`, shared `WATER` constants | Manual tool and both autonomous helpers | Same 12-second cooldown; saved marker; no repeated watering after reload; ripe transition preserved |
| Picking capacity | Distinct plot indices and owner capacity | Manual button, H, controlled local pick, autonomous picking | One/two/three distinct plots; no yield multiplier; full/partial barn safety; local reach in control mode |
| Streaks and visitors | Existing `rewardHarvestStreak` and per-input gap | Visitor frequency and bonus coins | Manual batch is one streak input; helper events never earn streaks; existing caps remain |
| Storage and market cart | Existing `harvest` / `store` rules | Barn counts, wholesale revenue, fresh batches | No overfill, rejected crops stay ripe, minute cart limits and ordinary receipts remain correct |
| Save version 15 | Fresh/restore/save path, legacy fields | All existing saves and claimed levels | Malformed input safe; round trip; old owner grant only once; heat and crop timing retained |
| Farm sections and purchases | Pure status/quote APIs | Hold-to-buy, keyboard/gamepad menus, safe scrolling | Real UI purchases; disabled pause/level/shortfall; readable mobile and Fold layouts |
| Dial in existing action | Boost status only | HUD size, accessibility, reduced motion | Numeric/non-colour status; no extra panel; no DOM replacement every frame; disabled cooling and recovery |
| Owner event routing | Owner-tagged job event and bounded scene queue | Sprites and ingredient-delivery presentation | Correct owner; no unbounded queue; ingredient receiver is not interrupted |
| Level roadmap | New metadata lists only | Discovery of tiers, long-term progression | Gates listed at 5/9/10; no edits to earnings thresholds, rewards or existing level claims |

The source branch is based on lead `f2f96f8351dea4cf6072862b1e3e0b14d6a318dc`. Runtime edits are confined to farming, its owner/control adapters, save restoration and related UI. No village concept, ride scene, furniture asset, character sheet or general economy rebalance is included.

Lead integration risks are concentrated in `model.js`, `main.js`, `scene.js`, `life-actions.js`, `farm-sheets.js` and the one-line CSS build list. If Claude has unpublished changes there, apply the new modules first and merge the small adapters deliberately rather than replacing entire files. Read the incremental patch before applying it.
