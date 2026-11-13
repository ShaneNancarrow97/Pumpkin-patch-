# Village completion receipts and return confirmation

These helpers provide feedback around existing village transactions and travel. They never grant rewards, change a save, pause the farm or move the player. `village-game.js` remains the owner of those actions.

## Quest completion receipt

Import `createVillageQuestReceipt` from `src/ui/village-quest-receipt.js`:

```js
const receipt = createVillageQuestReceipt({
  mount: root,
  onOpenQuests: () => showPanel("journal"), // optional
});
// Only from a real emitted event, after the rules have awarded the quest:
receipt.notify(event);
// In the active village loop; let dialogue finish before showing the receipt:
receipt.tick({ blocked: dialogue.active || returnPrompt.active || menuOpen });
// On travel/scene teardown:
receipt.clear();
```

The compact, nonblocking purple card names the completed quest and lists the rewards in the actual `quest-done` event. A ticked painted quest seal, warm reward chips and a gentle entrance distinguish it from routine notifications. It appears for five seconds, followed by a short fade; reduced motion removes the animations. It never takes focus. Hovering or using its optional controls retains reading time, and dialogue/menus suspend it.

`notify(event)` accepts known `quest-done` events only. Each quest is accepted once per helper lifetime; clearing or reopening a menu cannot replay it. The pending/visible queue is bounded to four, and event titles/rewards are snapshotted when received. `clear()` discards pending presentation but retains the seen set; `destroy()` removes the helper permanently. Getters expose `active` and `element`.

The pure `villageQuestReceiptData(event)` uses the awarded rows, not the quest's advertised reward definition. It therefore does not invent friendship XP, unlocks or furniture that are absent from the event. Duplicate rewards are explicitly described as converted to bonus coins, without fabricating a conversion amount. Opening the journal or dismissing the card never awards anything.

## Return to the farm

Import `createVillageReturnPrompt` from `src/ui/village-return-prompt.js`:

```js
const returnPrompt = createVillageReturnPrompt({
  mount: root,
  onConfirm: () => performExistingReturn(),
  onCancel: () => releaseVillageInput(),
});
returnPrompt.setInput(input.source, input.pad?.g);
returnPrompt.open({ source: input.source, pad: input.pad?.g });
```

The modal asks “Return to your farm?” and reassures the player that village progress is kept. **Return to farm** is the initial focus and `data-pad-default`; **Stay in the village** cancels. Actual input determines the legends: DualSense Cross/Circle, Xbox A/B, keyboard Enter/Esc, or plain touch/pointer labels. Both buttons have at least 44px targets.

- `open({source, pad, opener})` returns false if already open or destroyed, and retains its true opener.
- `confirm()` / `cancel()` perform their callback once. The modal becomes inactive before invoking the caller, allowing a safe scene handoff.
- `close({restoreFocus: false})` is a silent programmatic close; it never invokes cancellation. Default close restores the opener when still available.
- `setInput(source, pad)` updates legends without stealing focus or polling a gamepad.
- `active` / `element` expose modal state and its buttons for the existing menu adapter.
- `destroy()` silently closes and removes its keyboard boundary.

The caller must neutralise the opening controller edge and route a fresh Cross to confirm and Circle to cancel. The helper adds no competing gamepad handler. Escape cancels; Tab stays inside the two choices; Enter retains native focused-button activation. A callback that opens another menu keeps its new focus.

## Style and integration boundaries

Include `src/ui/village-feedback.css` once after the existing village layers. Its selectors are scoped to the two new roots. The full-screen return scrim stays **unzoomed** and only its inner card receives TV zoom. The receipt root receives TV zoom itself. Do not add either helper to a second global TV zoom selector. Portrait/landscape phone rules keep the card scrollable, and TV maximum heights divide by the current zoom.

| Dependency | Owner / effect |
| --- | --- |
| `quest-done` events | Rules award/save once; receipt only presents emitted granted rows. |
| `village-game.js` | Route actual return requests through the prompt, own fresh controller edges and menu blocking, notify from events, tick/clear receipts. |
| Existing narration/dialogue | Remain unchanged; receipts wait until dialogue is clear. |
| Existing painted icon atlases | Quest and farm art reused; no image, installer or network dependency. |
| Save/load and economy | No changes. Do not reconstruct receipts from saved completed quests. |
| Build/main | Parent includes the CSS; these helpers do not edit entry points. |

## Validation

Nine named tests genuinely execute and pass:

```sh
node --test --test-isolation=none test/village-feedback.test.mjs
```

Coverage includes a real completed `finishTalk` event with unchanged saved data, actual duplicate reward conversion, snapshot/dedup/bounded queue behaviour, deferred/paused expiry, optional journal action once, confirm/cancel once, silent close, keyboard containment/release, input-family legends and focus handoff. The CSS parses with esbuild without warnings, and `git diff --check` passes.

No browser, build, entry-point, Android, content, rules, commit or push changes were made by this helper subtask. Parent integration owns the exact-HTML phone/Fold/TV screenshots and travel/controller flow checks.
