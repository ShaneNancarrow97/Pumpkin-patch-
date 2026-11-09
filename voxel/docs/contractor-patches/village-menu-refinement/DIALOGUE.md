# Village dialogue ribbon and action choices

This presentation replaces the previous side-card layout in `CONVERSATIONS.md`. The village stays visible behind a low speech ribbon on the left and a separate rounded choice stack on the right. A compact nameplate and small speaker cue replace the large portrait header. The game's own plum palette, cream text, painted icons and characters are retained.

The selected pill turns warm amber. Normal choices remain dark purple; disabled choices keep their actual requirement text visible. Longer dialogue and choices scroll independently. The speech footer keeps voice controls secondary to Continue/Finish chat, with a separate Back control at the lower right. A narrow portrait phone stacks the speech and choices; unfolded, landscape and TV layouts retain two columns when space permits. Controls remain at least 44px and essential text at least 12px. Nonessential motion respects reduced-motion settings; touch and TV do not use backdrop blur.

## Presenter contract

The existing `createVillageConversation` API and selectors remain. The constructor still calls `onChoice(index, {id, page, choice})`, `onContinue` and `onClose`. The presenter never spends coins/items, starts quests or grants rewards itself.

- `options.intent` identifies the current session. `greeting` names a menu of real neighbour actions. Without it, a heading implies quest dialogue and other scripted lines are chat.
- Choices retain their exact indices and objects. They may provide `id`, explicit `intent`, `text` (or `label`), `description` (or `hint`/`requires`) and `disabled`. `tone` is retained for ordinary daily replies.
- `chat`, `quest`, `gift`, `about`, `leave` and `continue` artwork comes from the existing icon helper. Tone replies use chat art. Text is never interpreted to invent an action.
- The caller supplies only actions supported by current game state. There are no placeholder hang-out choices or fabricated locked quests.
- A real action callback captures its transaction, closes the greeting and then invokes the existing game handler. A changed session, or `{handled:true}`, prevents the scripted Thank-you fallback. False rejects the attempt and permits a later valid selection.
- Every reply listener captures its rendered session, page and exact choice. Detached controls from an earlier greeting cannot transact after the dialogue has been replaced.

Call `dialogue.setInput(source, pad)` after polling village controls. `source` is the actual touch/pointer/keyboard/pad source and `pad` is the active standard gamepad (or explicit family string). The method caches its current presentation mode and does not inspect layout or poll controllers. DualSense shows the existing vector Cross/Circle, other standard pads show A/B, keyboard shows Enter/Esc, and touch/pointer omit key glyphs. Enter is native focused-button activation; the world’s E action is not falsely advertised as a dialogue binding.

## Integration boundaries

| Surface | Requirement |
| --- | --- |
| `village-game.js` | Supply real action callbacks, preserve the proximity checks and pass the active input source/pad. Hide village dock and movement HUD while the bottom dialogue is open. |
| `village-controls.js` | Continues to own controller navigation, button edges, movement blocking and scroll. The presenter adds no competing pad handler. |
| `dialogue-choice-icons.js` | Decorative existing art only; no transactions or new runtime images. It relies on the already installed village/premium atlases. |
| Narration | Original line text/speakers, mute/replay, missing-recording fallback and once-only replies are retained. |
| Keyboard/focus | Initial focus is the first usable choice or Continue. Tab stays among visible enabled controls. Replacement/close callbacks retain the true opener and cannot steal a newly opened session’s focus. |
| CSS | Load after `village-ui.css`. The global TV zoom applies to the one root. `.village-reply > span` remains the copy span; icons and input badges use `i`. |

## Checks

Thirty affected named tests pass under the execution profile that permits Node child processes:

```sh
node --test test/narration-surfaces.test.mjs test/narration.test.mjs \
  test/village-controls.test.mjs
```

Added regressions cover disabled real actions and first usable focus, explicit handled actions without an invented reply, detached stale choices, and input-family changes during a conversation. Existing narration, choice-once, opener, Tab and callback handoff regressions continue to pass. The icon helper has its own mapping checks from its owner.

No browser, build, commit or generated asset edits were performed by this subtask. Parent integration owns exact-HTML screenshots, long-content/phone/Fold/TV layout verification and the real resident-action flows.
