# Village expansion runtime and UI handover

This work connects the expansion rules and authored world to the existing village controller. It uses the existing movement, gamepad menu owner, dialogue camera, narration controls, save path and return confirmation. Legacy quests, shops and interiors remain available.

## Player flow

- Open Quests to follow a main chapter. Optional neighbour stories sit in a separate collapsed section; a followed personal story remains visible above that section.
- The tracker combines legacy quests and expansion chapters. Saved model tracking restores the actual chapter title, destination area, progress and giver portrait; choosing a chapter’s walking route follows that chapter too. A completed followed chapter retains its title, full count and a clear prompt to choose the next story. Reward previews and receipts resolve real furnishing, costume and recipe names without changing any award. Journal and map browsing only inspect requirements/rewards and set walking markers; they do not complete activities or move the player.
- Walk to a clue, restoration or puzzle prop and use the contextual interaction. Every action rechecks the actor’s current physical area and distance before calling the model.
- There are four real puzzle presenters: ordered patterns, rotating connected lantern conduits, unordered ingredient selections and assigned performance slots. Reset and an optional explicit solution aid use the same rule path.
- The cave entrance, depth stairs and return stairs use layer-specific targets. Back from a lower depth restores the preceding landing; Back from the first depth returns outside. Only the subsequent village exit asks to return to the farm.
- Controller gathering targets include every ready district, so later-region timber, ore and herbs use the same proximity/tool flow as the Green.
- Mining is a cancellable 1.15-second pickaxe action with contact sounds. The resource transaction happens after the final contact. Circle, pause, closing the village and stale distant controls cannot award an early resource.
- Nearby residents expose current stories, their own economic workshop and companion invitation/dismissal. Companion selection uses the saved friendship rule and is restored when entering the village.
- Cast chapter opening dialogue follows the first saved investigation. Final reveals use the authored closing scene. Closing/skipping dialogue cannot re-award progress because the transaction has already committed. Finale colour choices are stored by the model and share the same reward.
- Chapter completion displays a compact reward receipt for six seconds of unobstructed gameplay. Its timer waits while a dialogue, puzzle, menu or return prompt is open.
- Gems appear in the satchel. Unreserved rare gems may be sold only while standing beside Rowan’s stall. Quest crystals are separate and have no sell control.
- New home interiors check their area unlock and the real door approach before entry. Underground map shortcuts guide back to stairs instead of sending the camera to an invisible surface layer.

## Files and dependencies

| Runtime surface | Authoritative dependency |
| --- | --- |
| `src/village-game.js` | Model expansion queries/actions, `view.expansionTargets`, active cave layer, existing controls and dialogue |
| `src/ui/village-expansion-pages.js` | Pure read-only presenter; generated atlas icon markup |
| `src/ui/village-expansion-pages.css` | Existing purple village design tokens; include after the village feedback CSS in the build |
| `src/ui/dialogue-choice-icons.js` | Workshop/companion intentions map onto the existing dialogue icon vocabulary |
| Economy pages | `ui/village-expansion-economy.js`; transactions recheck Tansy/Opal/Cinder/Granny proximity |
| Companion actions | `rules/village-expansion-companions.js`; visuals through `view.setExpansionCompanion` |
| Area entry and movement | `view.enterExpansionArea`, `leaveExpansionArea`, `expansionGroundAt`, `moveExpansionWalker` |

All new DOM actions use 44px minimum touch targets and at least 12px text. Periodic refresh preserves panel folds, scroll and focused data identity. The existing fresh-neutral input boundary remains the single movement/menu input owner.

The cave mouth and `cave-shallows.returnPoint` must remain the same canonical world coordinate. World and rule owners moved it to design (-30,106), world (-45,159), inside Moonroot Copse.

## Verification

Focused command:

```sh
node --test --test-isolation=none test/village-game.test.mjs test/village-expansion-pages.test.mjs
```

This includes the existing controller, touch/keyboard/pad isolation, menu selection, quest handover, travel confirmation, gathering and dialogue return regressions, plus actual Cross-started cave mining, cancellation, stale underground action rejection, remote canvas portal rejection, previous-floor return and the distinct puzzle/map/journal presenters.

Full artifact build, browser layout/controller screenshot pass and packaging belong to the root integration pass. No browser, build, commit or push was performed by this runtime subtask.
