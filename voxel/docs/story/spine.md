# The Stopped Hour — proposal for Claude's story review

This is handover75 B2's design document, **not a shipped story rewrite**. The current quests, rewards, district gates, farm level requirements and save records remain in force. The atmosphere/interior/journal contract prepares their presentation without changing their meaning. Review this spine and the [complete existing chapter index](chapter-index.md) before writing replacement dialogue or migrating either quest engine.

Mothlight kept a bargain with its moths: the village would leave a welcoming light in every window, and the moths would keep its memories. When the neighbours stopped visiting, those lights went out. Blackroot grew into the empty spaces between them. The Moonclock's stopped hour is the moment the village forgot how to welcome people, rather than an unexplained curse to defeat by paying a higher number.

Shane and Natalie bring the practical things a village needs: pumpkins, supper, materials and the patience to knock again. Every district gives them something useful to take home. Restoring the farm supports the village; learning the village's crafts makes the farm easier to run and their home more personal. The arc should make the player want to return to both places.

| Act | Existing material to build around | Emotional change | Farm connection |
|---|---|---|---|
| I · A light left on | Invitation, Rowan/Elowen legacy chains, Green research/workshop/supper | A visitor becomes a neighbour; two empty homes become places worth entering | Gathering tools, furnished homes, working stall, first shared cooking |
| II · Windows through the dark | Copse, Quarry, Moor, Marsh, Granny and the Blackroot thread; optional personal arcs within them | Restorations recover a different memory of the same broken promise | Recipes and delivery commissions, preservation, costume crafts, useful household sets and attraction scenery |
| III · Everyone has a place | Festival preparation, arrangements and Lantern Night | The village makes an invitation that includes its least comfortable residents | Bring ingredients and harvests back for a celebration that recognises the player's farm work |

The existing chapter index maps **every current entry**, including personal chapters, to this structure. It is a coverage map, not a new dependency order. Review whether the Moonclock repair should be a separate bridge before the existing finale; do not quietly insert it into level gates. Proposed late-game repeatables should reward varied farm/village work and friendship, with useful decorating choices; they should not replace once-only restoration rewards or generate unlimited progression credit.

The next content pass should vary what the player actually does. Keep the first clear sequence puzzle as teaching, then alternate investigation, gathering, repair, cooking, accompaniment and festival preparation. A clue should support a deduction through the world. A room's objects and a resident's changed response should show a restoration before a journal paragraph explains it. Scares stay uncanny and original: a window lit in an empty house, a kettle answering a question, roots listening under a floor.

Review decisions before implementation: agree the story's final wording and clock behaviour; decide which duplicate-titled arcs to retitle or merge; select the first two genuinely different puzzle families; and approve the legacy migration table. That table needs all 46 existing legacy step boundaries, baselines, claims and already-built homes compared against the current rules. A partial save must never pay again, lose a reward or have to repeat a finished task. The new unified journal is a read model over those rules, not that migration.

Run `node tools/village-story-audit.mjs --out /tmp/mothlight-story-audit.json --markdown /tmp/mothlight-chapters.md` for the current inventory, repeated step shapes, duplicate titles and clues containing all answer tokens. The report deliberately describes existing content; it does not pretend the future B9 lint already passes.
