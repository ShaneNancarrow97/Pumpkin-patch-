# Neighbour interactions require walking up

Village selection now guides the player towards a neighbour. People, Quests and map sprite clicks share the same distance check: a distant choice closes its panel, restores the follow camera, shows a direction marker and leaves saved state untouched. The marker follows outdoor residents as their routines move them.

Conversation, quest acceptance, handovers, gifts and favours require the owner beside that neighbour. Outdoor range is three world units from the live, collision-clear talking spot; room hosts use their actual room position and a 3.3-unit counter reach. Vesper's outdoor selection points towards the Velvet Bat doorway, and he can only greet the player inside, beside the counter. This keeps the existing visible Talk action and PS5 Cross button as the interaction path. Routine menu browsing remains available anywhere.

No save format, economy or quest content changes. The introduction flyover retains its scripted narration; it does not remotely complete resident conversations. Menus and dialogue still stop owner movement. Stale menu callbacks recheck distance before spending anything.

| Dependency | Shared behaviour |
| --- | --- |
| `village-game.js` | Selection, live waypoint, nearby Talk, all resident transactions |
| `village-folk.js` `talkSpot()` | Current roaming position and reachable counter approach |
| `village-view.js` `INSIDES` | Correct host, room coordinates and external doorway |
| `ui/village-chapters.js` | Journal delivery routes through the same controller check |
| `test/village-game.test.mjs` | Real controller approach, remote refusal, host counter and menu priority |

Browser QA scripts that previously called `meet()` remotely must walk to the live talking spot. A diagnostic rules-only fixture can explicitly stage quest state, but should not be represented as a physical conversation test.

Validation: all 27 assertions across `village-game`, `village-chapters` and `village-resident-life` pass. These include the physical controller approach and counter reach, live direction marker, refusal of distant transactions and stale callbacks, existing quest/purchase flows, tour/input priorities and resource gathering. Browser rendering and physical PS5 hardware checks are part of the parent release review, not claimed by this focused rules/controller pass.
