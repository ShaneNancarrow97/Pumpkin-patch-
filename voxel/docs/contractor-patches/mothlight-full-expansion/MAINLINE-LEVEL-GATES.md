# Mainline village level checkpoints

Levels6–20 now check village mainline completion as well as the existing earnings and home criteria. Bonus coins still do not count as earned progression. Previously claimed levels and honoured legacy levels are never revoked; unclaimed future levels use the new requirements. No save schema change. New resident personal/friendship arcs and Granny's optional branch are not added as level requirements; original Two Doorbells prerequisites stay intact.

| Reach level | Required story |
| --- | --- |
| 6 | All three Green chapters: The Ink Beneath the Roots, A Door Worth Knocking On, A Seat for Somebody |
| 7 | The Stone That Hums (Copse clues and shallow cave) |
| 8 | Every Window a Welcome (Copse restored) |
| 9 | Copse restoration and Green seal checkpoint before the Quarry |
| 10 | The Stone That Rang |
| 11 | The Supper That Never Arrived |
| 12 | Supper After Midnight (restaurant opens) |
| 13 | A Silent Midway |
| 14 | A Guest, Not a Customer |
| 15 | All four seals, including The Last Bow |
| 16 | The Path That Remembered |
| 17 | The Root Cathedral |
| 18 | A Window for Every Light |
| 19 | An Invitation for Everyone (fresh farm harvest/cooking) |
| 20 | The Village Is the Table (including actual supper delivery) |

Lantern Night remains a level20 capstone. It must not gate entry to level20 itself. Each gate's chapter/region is available at an earlier level. The level checklist shows named incomplete chapters, compound progress, and the missing seal regions. Earned income remains banked while blocked.

Dependency boundary: canonical gates in content/village-expansion.js; dependency-light evaluation in rules/village-expansion-access.js; existing homeRequirements combines both sets. Do not call patchLevel from expansionLevelRequirement: that would recurse through homeRequirements. When changing a chapter's level, region or prerequisite, recheck its gate and resource reachability. Economy automation tools must complete/declare mainline progress rather than assuming earnings alone advance every level.

New regression tests cover all15 checkpoints as the sole blocker with household criteria fulfilled, completing the gate without losing income, save/reload of honoured levels, earlier-level mainline availability and useful four-seal progress labels. Existing home/economy tests explicitly declare completed mainline fixtures where they isolate unrelated behavior.
