# Village conversations

Conversation changes are confined to `ui/village-conversation.js` and its finishing stylesheet. The existing constructor API, reply attributes, speaker lookup and narration callbacks are retained. No quest, friendship, save or economy rules change.

The first visible reply or Continue button receives focus when a conversation opens. Tab and Shift+Tab stay among its visible, enabled buttons; hidden voice controls, hidden Continue and disabled replay are skipped. Enter and Space keep native button behaviour, and village controller input still goes through `createVillageControls.handleMenu`, so there is no duplicate pad activation. Escape retains its previous close behaviour.

The final action now reads **Finish chat**, while earlier pages say **Continue**. Choice pages identify **Your reply**. Closing restores the true opener when it remains visible and connected. Replacing a conversation preserves that opener, and callbacks that open another session retain the new session's focus instead of restoring an old menu button. A returned reply resets the scroll position so the new line is visible.

The near-solid plum surface, cream text and amber primary action retain the game's palette. A smaller portrait/header protects more world space; the body scrolls while header and footer remain in view. Voice controls remain secondary, with 44px targets. The hard-coded PlayStation Cross badge was removed from the primary button because the existing village controller legend already supplies the actual input prompt. Portrait, landscape and TV sizing and reduced-motion support remain local to the conversation surface.

## Dependencies and checks

| Surface | Integration boundary |
| --- | --- |
| Village controller | Continues to own pad navigation, button edges and world blocking. Conversation owns only Tab containment and its existing Escape close. |
| Narration controls | Existing mute/replay and missing/blocked recording handling are retained. Replaying never advances a page or quest. |
| Root dialogue callbacks | A close or completion callback can open a new session; focus restoration must not steal that session's primary action. |
| Layout | Load this stylesheet after `village-ui.css`; the existing global TV zoom still scales the one dialog root. |

Twenty-five affected tests pass:

```sh
node --test test/narration-surfaces.test.mjs test/narration.test.mjs test/village-controls.test.mjs
```

The four new focus regressions exercise real conversation callbacks with a small DOM harness: visible reply Tab wrapping, speaking/replacement focus, a close callback handoff, and a completion callback handoff. Browser screenshots and real viewport/controller checks remain the parent integration task; no browser run or visual certification was performed by this subtask.
